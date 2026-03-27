import {
	hasHydrationMarkers,
	hydrate as hydrateJsx,
	render as renderJsx,
	renderToString as renderJsxToString,
	type JsxRenderable,
	type RenderToStringOptions,
} from '@ecopages/jsx';
import { RadiantComponentSsrService } from './radiant-component-ssr';
import { getReactivePropDefinitions } from './reactive-prop-metadata';
import { RadiantElement } from './radiant-element';
import {
	DEFAULT_SLOT_NAME,
	SLOT_PROJECTION_SCRIPT_ATTRIBUTE,
	captureProjectedSlotRenderables,
	deserializeProjectedSlotRenderables,
	parseProjectedSlotRenderablesFromHtml,
	resolveSlotProjection,
	serializeProjectedSlotRenderables,
	takeSlotProjectionScriptPayload,
} from './slot-projection';

/**
 * A structured JSX-first Radiant base class.
 * @typeParam Bindings - Explicit internal bindable shape. Include only the
 * prop/state keys that JSX bindings should accept.
 *
 * Treat this as the component's internal reactive/bindable surface, not as the
 * default public custom-element attribute contract. When a component exposes a
 * narrower external API than its internal state, declare a separate public
 * props type for the JSX intrinsic element and keep internal-only state out of
 * that contract.
 *
 * Reusing the same type for both is fine only when the public props and the
 * bindable reactive members are intentionally the same surface.
 *
 * - `render()` describes the view.
 * - `update()` commits the current view into the host.
 * - first render happens automatically on connect.
 * - rerenders remain explicit through `update()` or decorators such as `@onUpdated`.
 */
export class RadiantComponent<Bindings extends object = {}> extends RadiantElement<Bindings> {
	private isRendering = false;
	private isFirstConnectPending = false;
	private isRenderScheduled = false;
	private needsRender = false;
	private projectedSlotContent = new Map<string, JsxRenderable[]>();
	private slotProjectionObserver?: MutationObserver;
	private slotProjectionVersion = 0;
	private readonly ssr = new RadiantComponentSsrService({
		constructor: this.constructor as CustomElementConstructor,
		getHydrationBindings: () => this.getHydrationBindings(),
		getSlotProjectionScriptTag: () => this.getSlotProjectionScriptTag(),
		renderToString: (options) => this.renderToString(options),
		getContextProviders: () => this.getContextProviders(),
		getReactiveProperties: () => this.getReactiveProperties(),
		getReactivePropDefinitions: () => getReactivePropDefinitions(this),
		getPropertyValue: (name) => (this as Record<string, unknown>)[name],
		listAttributeNames: () => (typeof this.getAttributeNames === 'function' ? this.getAttributeNames() : []),
		getAttributeValue: (name) => this.getAttribute(name),
	});

	override connectedCallback() {
		super.connectedCallback();

		if (this.isFirstConnectPending) {
			return;
		}

		this.isFirstConnectPending = true;

		queueMicrotask(() => {
			this.isFirstConnectPending = false;

			if (!this.isConnected) {
				return;
			}

			this.ensureSlotProjectionState();
			this.observeSlotProjection();

			if (hasHydrationMarkers(this)) {
				this.needsRender = false;
				this.hydrate();

				if (this.needsRender) {
					this.update();
				}

				return;
			}

			this.update();
		});
	}

	/**
	 * Returns the current component view.
	 */
	public render(): JsxRenderable {
		return '';
	}

	/**
	 * Serializes the current component view into HTML.
	 */
	public renderToString(options: RenderToStringOptions = {}): string {
		this.prepareForSsr();

		return renderJsxToString(this.resolveRenderOutput().value, options);
	}

	/**
	 * Returns the component host and current view as a JSX element.
	 */
	public renderHost(): JsxRenderable {
		return this.ssr.renderHost();
	}

	/**
	 * Serializes the component host and current view into HTML.
	 */
	public renderHostToString(options: RenderToStringOptions = {}): string {
		return this.ssr.renderHostToString(options, this.getHostSsrAttributes());
	}

	/**
	 * Hydrates an SSR-rendered component view in place.
	 */
	public hydrate(): void {
		if (!this.isConnected || this.isRendering) {
			return;
		}

		this.isRendering = true;
		this.disconnectSlotProjectionObserver();

		try {
			hydrateJsx(this.resolveRenderOutput().value, this);
		} finally {
			this.isRendering = false;
			this.observeSlotProjection();
		}
	}

	/**
	 * Queues a component rerender and coalesces repeated requests into the same
	 * microtask.
	 *
	 * Use this when reactive state may change multiple times in the same turn and
	 * the current view should refresh once with the final values.
	 */
	public requestUpdate(): void {
		this.needsRender = true;

		if (this.isRenderScheduled) {
			return;
		}

		this.isRenderScheduled = true;

		queueMicrotask(() => {
			this.isRenderScheduled = false;

			if (!this.needsRender) {
				return;
			}

			this.update();
		});
	}

	/**
	 * Explicitly rerenders the component into its host.
	 */
	public update(): void {
		this.needsRender = true;

		if (!this.isConnected || this.isRendering) {
			return;
		}

		if (this.isFirstConnectPending && hasHydrationMarkers(this)) {
			return;
		}

		while (this.needsRender && this.isConnected) {
			this.needsRender = false;
			this.isRendering = true;
			this.disconnectSlotProjectionObserver();

			try {
				renderJsx(this.resolveRenderOutput().value, this);
			} finally {
				this.isRendering = false;
				this.observeSlotProjection();
			}
		}
	}

	override disconnectedCallback() {
		this.disconnectSlotProjectionObserver();
		super.disconnectedCallback();
	}

	/**
	 * Returns the first projected element assigned to the default or named slot.
	 *
	 * Use this when component logic needs direct access to authored light-DOM
	 * content after projection.
	 *
	 * @param name Optional slot name. Omit for the default slot.
	 */
	public getSlotElement<T extends Element = Element>(name?: string): T | null {
		return (this.getSlotElements<T>(name)[0] ?? null) as T | null;
	}

	/**
	 * Returns all projected elements assigned to the default or named slot.
	 *
	 * Text nodes are intentionally excluded so the result matches the element-
	 * oriented query semantics used by Radiant decorators.
	 *
	 * @param name Optional slot name. Omit for the default slot.
	 */
	public getSlotElements<T extends Element = Element>(name?: string): T[] {
		this.ensureSlotProjectionState();

		return (this.projectedSlotContent.get(name ?? DEFAULT_SLOT_NAME) ?? []).filter(
			(renderable): renderable is T => typeof Node !== 'undefined' && renderable instanceof Element,
		);
	}

	protected override shouldAutoBindReactiveMembers(): boolean {
		return true;
	}

	protected getHostSsrAttributes(): Record<string, string> {
		return this.ssr.getHostAttributes();
	}

	private ensureSlotProjectionState(): void {
		if (this.projectedSlotContent.size > 0) {
			return;
		}

		const scriptPayload = this.isConnected ? takeSlotProjectionScriptPayload(this) : undefined;

		if (typeof scriptPayload === 'string' && scriptPayload !== '') {
			this.projectedSlotContent = deserializeProjectedSlotRenderables(scriptPayload);
			this.slotProjectionVersion += 1;
			return;
		}

		if (this.getHostChildNodeCount() > 0) {
			this.projectedSlotContent = captureProjectedSlotRenderables(this);
			this.slotProjectionVersion += 1;
			return;
		}

		const innerHtml = typeof this.innerHTML === 'string' ? this.innerHTML : '';

		if (!this.isConnected && innerHtml !== '') {
			this.projectedSlotContent = parseProjectedSlotRenderablesFromHtml(innerHtml);
			this.slotProjectionVersion += 1;
		}
	}

	private getHostChildNodeCount(): number {
		return 'childNodes' in this && this.childNodes ? this.childNodes.length : 0;
	}

	private getSlotProjectionScriptTag(): string | undefined {
		this.ensureSlotProjectionState();
		const payload = serializeProjectedSlotRenderables(this.projectedSlotContent);

		if (!payload) {
			return undefined;
		}

		return `<script type="application/json" ${SLOT_PROJECTION_SCRIPT_ATTRIBUTE}>${escapeScriptText(payload)}</script>`;
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
				if (addedNode.parentNode !== this) {
					continue;
				}

				if (this.addProjectedSlotNode(addedNode)) {
					hasProjectionChanges = true;
				}
			}
		}

		if (hasProjectionChanges) {
			this.slotProjectionVersion += 1;
			this.update();
		}
	}

	private addProjectedSlotNode(node: Node): boolean {
		if (node instanceof HTMLScriptElement && node.hasAttribute(SLOT_PROJECTION_SCRIPT_ATTRIBUTE)) {
			return false;
		}

		const slotName = node instanceof Element ? (node.getAttribute('slot') ?? DEFAULT_SLOT_NAME) : DEFAULT_SLOT_NAME;
		const bucket = this.projectedSlotContent.get(slotName);

		if (bucket) {
			if (bucket.includes(node)) {
				return false;
			}

			bucket.push(node);
			return true;
		}

		this.projectedSlotContent.set(slotName, [node]);
		return true;
	}

	private removeProjectedSlotNode(node: Node): boolean {
		for (const [slotName, bucket] of this.projectedSlotContent.entries()) {
			const nodeIndex = bucket.indexOf(node);

			if (nodeIndex === -1) {
				continue;
			}

			bucket.splice(nodeIndex, 1);

			if (bucket.length === 0) {
				this.projectedSlotContent.delete(slotName);
			}

			return true;
		}

		return false;
	}

	private observeSlotProjection(): void {
		if (typeof MutationObserver === 'undefined' || this.slotProjectionObserver || !this.isConnected) {
			return;
		}

		this.slotProjectionObserver = new MutationObserver((records) => this.handleSlotProjectionMutations(records));
		this.slotProjectionObserver.observe(this, { childList: true });
	}

	private disconnectSlotProjectionObserver(): void {
		this.slotProjectionObserver?.disconnect();
		this.slotProjectionObserver = undefined;
	}

	private resolveRenderOutput(): { containsSlots: boolean; value: JsxRenderable } {
		this.ensureSlotProjectionState();
		return resolveSlotProjection(this.render(), this.projectedSlotContent);
	}
}

function escapeScriptText(value: string): string {
	return value.replace(/</g, '\\u003c');
}
