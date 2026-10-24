import {
	hasHydrationMarkers,
	hydrate as hydrateJsx,
	isKeyedJsxValue,
	render as renderJsx,
	type JsxRenderable,
} from '@ecopages/jsx';
import { isMinimalDomElement } from './minimal-dom-identity';
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
	isTemplateResultLike,
	resolveSlotProjection,
	serializeProjectedSlotRenderables,
	takeSlotProjectionScriptPayload,
} from './slot-projection-runtime';

export type RenderRuntimeHost = HTMLElement & {
	render(): JsxRenderable;
	requestUpdate(): void;
};

/**
 * Owns a render-owning host's render and the content its `<slot>` elements resolve against.
 *
 * @remarks Slot content has one of two sources. A host that a JSX view creates receives a Children Value
 * ({@link setChildrenValue}): `<slot />` resolves to it, named slots to their fallback, and only this host's
 * renderer touches the resulting nodes. Any other host takes its Authored Children: they are
 * captured once at first render, from the SSR slot-projection payload when present, and nodes appended to the
 * host later are projected too.
 */
export class RenderRuntime {
	#host: RenderRuntimeHost;
	#projectedSlotContent = new Map<string, JsxRenderable[]>();
	#hasChildrenValue = false;
	#childrenValue: JsxRenderable = null;
	#childrenBounds?: [Text, Text];
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

	/**
	 * @remarks For a host that receives a Children Value, the default slot's elements are the top-level elements
	 * that value rendered to, and named slots are always empty. Before the first client render there are none.
	 */
	getSlotElements<T extends Element = Element>(name?: string): T[] {
		if (this.#hasChildrenValue) {
			const elements: T[] = [];
			const [start, end] = this.#childrenBounds ?? [];

			if (name) {
				return elements;
			}

			for (let node = start?.nextSibling; node && node !== end; node = node.nextSibling) {
				if (node instanceof Element) elements.push(node as T);
			}

			return elements;
		}

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
		this.commit(hydrateJsx, renderTarget);
	}

	render(renderTarget: HTMLElement): void {
		this.commit(renderJsx, renderTarget);
	}

	/**
	 * Makes `value` the host's children, as a JSX view passed them. From then on the host no longer captures
	 * or projects its DOM children.
	 */
	setChildrenValue(value: JsxRenderable): void {
		this.#hasChildrenValue = true;
		this.#childrenValue = value;
		this.#projectedSlotContent.clear();

		try {
			if (process.env.NODE_ENV !== 'production') {
				warnSlotAttributeInChildren(this.#host, value);
			}
		} catch {}
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

	/**
	 * Capture authored light-DOM slot content once, before the host's own first render.
	 *
	 * @remarks
	 * Prefer the `data-radiant-slot-projection` script when present. Otherwise treat
	 * "host has children" as authored content only while `#hasMounted` is still false —
	 * after the first pass those children are the host's own light-DOM output and must
	 * not be fed back in as slot content.
	 *
	 * `#hasMounted` alone misses SSR hydration: the host already holds its server-rendered
	 * markup while the flag is false. Client-side, {@link hasHydrationMarkers} is the
	 * positive signal to skip capture (authored SSR content arrives via the script above).
	 * In the minimal SSR DOM the children *are* authored and there are no markers yet,
	 * so the marker walk is skipped for those hosts.
	 */
	private ensureSlotProjectionState(): void {
		if (this.#hasChildrenValue || this.#projectedSlotContent.size > 0) {
			return;
		}

		const scriptPayload = this.#host.isConnected ? takeSlotProjectionScriptPayload(this.#host) : undefined;

		if (typeof scriptPayload === 'string' && scriptPayload !== '') {
			this.#projectedSlotContent = deserializeProjectedSlotRenderables(scriptPayload);
			this.#slotProjectionVersion += 1;
			return;
		}

		if (
			!this.#hasMounted &&
			this.#host.childNodes.length > 0 &&
			(isMinimalDomElement(this.#host) || !hasHydrationMarkers(this.#host))
		) {
			try {
				if (process.env.NODE_ENV !== 'production') {
					warnLateDefinition(this.#host);
				}
			} catch {}

			this.#projectedSlotContent = captureProjectedSlotRenderables(this.#host);
			this.#slotProjectionVersion += 1;
		}
	}

	private handleSlotProjectionMutations(records: MutationRecord[]): void {
		if (this.#hasChildrenValue) {
			try {
				if (process.env.NODE_ENV !== 'production') {
					warnAppendedNodes(this.#host, records);
				}
			} catch {}

			return;
		}

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

	/**
	 * @remarks A host fed by a view gets a new slot projection version on every commit, since each one can
	 * change what its children rendered to.
	 */
	private commit(mount: (value: JsxRenderable, target: HTMLElement) => void, renderTarget: HTMLElement): void {
		this.disconnectSlotProjectionObserver();

		try {
			mount(this.resolveTrackedRenderOutput().value, renderTarget);
		} finally {
			this.#hasMounted = true;

			if (this.#hasChildrenValue) {
				this.#slotProjectionVersion += 1;
			}

			this.observeSlotProjection();
		}
	}

	/**
	 * @remarks For a host that receives a Children Value, `<slot />` resolves to that value, or to its fallback
	 * when the value is empty. On the client the children render between two empty text nodes this runtime keeps, so
	 * {@link getSlotElements} can find what they rendered to.
	 */
	private resolveRenderOutput(): { containsSlots: boolean; value: JsxRenderable } {
		this.ensureSlotProjectionState();
		const value = this.#childrenValue;
		let content = this.#projectedSlotContent;

		if (this.#hasChildrenValue && value !== null && value !== undefined && value !== '') {
			if (this.#host.isConnected) {
				const [start, end] = (this.#childrenBounds ??= [
					document.createTextNode(''),
					document.createTextNode(''),
				]);
				content = new Map([[DEFAULT_SLOT_NAME, [start, value, end]]]);
			} else {
				content = new Map([[DEFAULT_SLOT_NAME, [value]]]);
			}
		}

		return resolveSlotProjection(this.#host.render(), content);
	}
}

const issuedWarnings = new Set<string>();

/**
 * @remarks
 * Development-only: callers wrap the call in `try { if (process.env.NODE_ENV !== 'production') { ... } } catch {}`,
 * so the app's bundler drops it in production and a page without `process` does not throw (see the package README).
 */
function warnOnce(host: HTMLElement, message: string): void {
	const warning = `[@ecopages/radiant] <${host.localName}> ${message}`;

	if (!issuedWarnings.has(warning)) {
		issuedWarnings.add(warning);
		console.warn(warning);
	}
}

/** @remarks A JSX child marked `slot="name"` still fills the default slot of a host fed by a view. */
function warnSlotAttributeInChildren(host: HTMLElement, value: JsxRenderable): void {
	const child = isKeyedJsxValue(value) ? value.value : value;

	if (Array.isArray(child)) {
		child.forEach((entry: JsxRenderable) => warnSlotAttributeInChildren(host, entry));
	} else if (isTemplateResultLike(child)) {
		const { parts, values } = child;
		const name = values[parts.findIndex((part) => part.type === 'attribute' && part.name === 'slot')];

		if (typeof name === 'string') {
			warnOnce(
				host,
				`fills its default slot with a JSX child marked slot="${name}"; pass it as the ${name} property.`,
			);
		}
	}
}

/**
 * @remarks The host's renderer always inserts before a range marker it keeps inside the host, so a node it
 * places never ends up last. A node appended with DOM APIs does; nodes inserted elsewhere go unreported.
 */
function warnAppendedNodes(host: HTMLElement, records: readonly MutationRecord[]): void {
	if (records.some((record) => Array.from(record.addedNodes).some((node) => node === host.lastChild))) {
		warnOnce(host, 'ignores appended nodes; change its children in the parent view.');
	}
}

/**
 * @remarks A JSX renderer leaves empty text nodes around the ranges it owns, and the HTML parser never
 * creates one, so finding one at capture means a view rendered the children before the tag was defined. The
 * server's light DOM is skipped: it builds an empty text node for an empty string child.
 */
function warnLateDefinition(host: HTMLElement): void {
	if (
		!isMinimalDomElement(host) &&
		Array.from(host.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && !node.textContent)
	) {
		warnOnce(host, 'was defined after a JSX view rendered it, so it treats its children as Authored Children.');
	}
}

function escapeScriptText(value: string): string {
	return value.replace(/</g, '\\u003c');
}
