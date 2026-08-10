import {
	hasHydrationMarkers,
	hydrate as hydrateJsx,
	render as renderJsx,
	type JsxRenderable,
} from '@ecopages/jsx';
import { isServer } from '@ecopages/radiant/is-server';
import {
	createReactiveComputed,
	createReactiveWatcher,
	type ReactiveComputed,
	type ReactiveWatcher,
} from './reactivity-adapter';

import { HYDRATION_ATTRIBUTE } from './hydration-codec';
import {
	DEFAULT_SLOT_NAME,
	SLOT_PROJECTION_SCRIPT_ATTRIBUTE,
	collectAuthoredHydrationScriptMarkup,
	captureProjectedSlotRenderables,
	deserializeProjectedSlotRenderables,
	resolveSlotProjection,
	serializeProjectedSlotRenderables,
	takeSlotProjectionScriptPayload,
} from './slot-projection-runtime';

export type RenderRuntimeHost = HTMLElement & {
	render(): JsxRenderable;
	requestUpdate(): void;
};

export class RenderRuntime {
	#host: RenderRuntimeHost;
	#projectedSlotContent = new Map<string, JsxRenderable[]>();
	#renderSignal?: ReactiveComputed<{ containsSlots: boolean; value: JsxRenderable }>;
	readonly #renderWatcher: ReactiveWatcher;
	#slotProjectionObserver?: MutationObserver;
	#slotProjectionVersion = 0;
	#hasMounted = false;

	constructor(host: RenderRuntimeHost) {
		this.#host = host;
		this.#renderWatcher = createReactiveWatcher(() => {
			this.#host.requestUpdate();
		});
	}

	get slotProjectionVersion(): number {
		return this.#slotProjectionVersion;
	}

	/**
	 * @remarks True after the first client `hydrate`/`render` into this host. Used to
	 * avoid re-hydrating across disconnect/reconnect when SSR markers may still remain
	 * under projected light-DOM content.
	 */
	get hasMounted(): boolean {
		return this.#hasMounted;
	}

	/** Whether authored or persisted slot content is currently projected into this host. */
	get hasProjectedSlotContent(): boolean {
		this.ensureSlotProjectionState();
		return this.#projectedSlotContent.size > 0;
	}

	getSlotElements<T extends Element = Element>(name?: string): T[] {
		this.ensureSlotProjectionState();

		return (this.#projectedSlotContent.get(name ?? DEFAULT_SLOT_NAME) ?? []).filter(
			(renderable): renderable is T => typeof Node !== 'undefined' && renderable instanceof Element,
		);
	}

	getSlotProjectionScriptTag(): string | undefined {
		this.ensureSlotProjectionState();
		const payload = serializeProjectedSlotRenderables(this.#projectedSlotContent);

		if (!payload) {
			return undefined;
		}

		return `<script type="application/json" ${SLOT_PROJECTION_SCRIPT_ATTRIBUTE}>${escapeScriptText(payload)}</script>`;
	}

	getAuthoredHydrationScriptMarkup(): string | undefined {
		return collectAuthoredHydrationScriptMarkup(this.#host) ?? undefined;
	}

	hydrate(renderTarget: HTMLElement): void {
		this.disconnectSlotProjectionObserver();

		try {
			hydrateJsx(this.resolveTrackedRenderOutput().value, renderTarget);
		} finally {
			this.#hasMounted = true;
			this.observeSlotProjection();
		}
	}

	render(renderTarget: HTMLElement): void {
		this.disconnectSlotProjectionObserver();

		try {
			renderJsx(this.resolveTrackedRenderOutput().value, renderTarget);
		} finally {
			this.#hasMounted = true;
			this.observeSlotProjection();
		}
	}

	observeSlotProjection(): void {
		if (typeof MutationObserver === 'undefined' || this.#slotProjectionObserver || !this.#host.isConnected) {
			return;
		}

		this.#slotProjectionObserver = new MutationObserver((records) => this.handleSlotProjectionMutations(records));
		this.#slotProjectionObserver.observe(this.#host, { childList: true });
	}

	disconnectSlotProjectionObserver(): void {
		this.#slotProjectionObserver?.disconnect();
		this.#slotProjectionObserver = undefined;
	}

	disconnectRenderWatcher(): void {
		if (!this.#renderSignal) {
			return;
		}

		this.#renderWatcher.unwatch(this.#renderSignal);
		this.#renderSignal = undefined;
	}

	resolveTrackedRenderOutput(): { containsSlots: boolean; value: JsxRenderable } {
		const nextRenderSignal = createReactiveComputed(() => this.resolveRenderOutput());
		const output = nextRenderSignal.get();

		if (!this.#host.isConnected) {
			return output;
		}

		if (this.#renderSignal) {
			this.#renderWatcher.unwatch(this.#renderSignal);
		}

		this.#renderSignal = nextRenderSignal;
		this.#renderWatcher.watch(nextRenderSignal);
		return output;
	}

	dispose(): void {
		this.disconnectSlotProjectionObserver();
		this.disconnectRenderWatcher();
	}

	private ensureSlotProjectionState(): void {
		if (this.#projectedSlotContent.size > 0) {
			return;
		}

		const scriptPayload = this.#host.isConnected ? takeSlotProjectionScriptPayload(this.#host) : undefined;

		if (typeof scriptPayload === 'string' && scriptPayload !== '') {
			this.#projectedSlotContent = deserializeProjectedSlotRenderables(scriptPayload);
			this.#slotProjectionVersion += 1;
			return;
		}

		// Only trust "the host has children" as authored slot content before the host's
		// own first render/hydrate pass has run. After that, any children present are the
		// host's own previously-rendered output (light-DOM mode writes into `this.#host`),
		// not user-authored content — capturing them here would feed a render's own output
		// back into itself as "slot content" on the next pass.
		//
		// `#hasMounted` alone cannot see the SSR case: on first hydrate the host already
		// holds its own server-rendered output while `#hasMounted` is still false. Hydration
		// markers are the positive signal for that. Authored content that existed at SSR time
		// arrives through the projection script above, so nothing is lost by skipping here.
		//
		// Server-side the children *are* the authored content and there are no markers yet,
		// so the check is client-only — the minimal SSR DOM also cannot back the marker walk.
		if (
			!this.#hasMounted &&
			this.#host.childNodes.length > 0 &&
			(isServer || !hasHydrationMarkers(this.#host))
		) {
			this.#projectedSlotContent = captureProjectedSlotRenderables(this.#host);
			this.#slotProjectionVersion += 1;
		}
	}

	private handleSlotProjectionMutations(records: MutationRecord[]): void {
		let hasProjectionChanges = false;

		for (const record of records) {
			for (const removedNode of Array.from(record.removedNodes)) {
				if (this.removeProjectedSlotNode(removedNode)) {
					hasProjectionChanges = true;
				}
			}

			for (const addedNode of Array.from(record.addedNodes)) {
				if (this.addProjectedSlotNode(addedNode)) {
					hasProjectionChanges = true;
				}
			}
		}

		if (hasProjectionChanges) {
			this.#slotProjectionVersion += 1;
			this.#host.requestUpdate();
		}
	}

	private addProjectedSlotNode(node: Node): boolean {
		if (!this.#host.contains(node)) {
			return false;
		}

		if (
			node instanceof HTMLScriptElement &&
			(node.hasAttribute(SLOT_PROJECTION_SCRIPT_ATTRIBUTE) || node.hasAttribute(HYDRATION_ATTRIBUTE))
		) {
			return false;
		}

		const slotName = node instanceof Element ? (node.getAttribute('slot') ?? DEFAULT_SLOT_NAME) : DEFAULT_SLOT_NAME;
		const bucket = this.#projectedSlotContent.get(slotName);

		if (bucket) {
			if (bucket.includes(node)) {
				return false;
			}

			bucket.push(node);
			return true;
		}

		this.#projectedSlotContent.set(slotName, [node]);
		return true;
	}

	/**
	 * Remove a projected slot node from the projected slot content.
	 *
	 * Light-DOM render moves projected nodes under an inner wrapper; the host still
	 * contains them, so do not drop projection entries for that repositioning.
	 *
	 * @param node
	 * @returns
	 */
	private removeProjectedSlotNode(node: Node): boolean {
		if (this.#host.contains(node)) {
			return false;
		}

		for (const [slotName, bucket] of this.#projectedSlotContent.entries()) {
			const nodeIndex = bucket.indexOf(node);

			if (nodeIndex === -1) {
				continue;
			}

			bucket.splice(nodeIndex, 1);

			if (bucket.length === 0) {
				this.#projectedSlotContent.delete(slotName);
			}

			return true;
		}

		return false;
	}

	private resolveRenderOutput(): { containsSlots: boolean; value: JsxRenderable } {
		this.ensureSlotProjectionState();
		return resolveSlotProjection(this.#host.render(), this.#projectedSlotContent);
	}
}

function escapeScriptText(value: string): string {
	return value.replace(/</g, '\\u003c');
}
