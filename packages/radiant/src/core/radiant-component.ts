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
	private needsRender = false;
	private readonly ssr = new RadiantComponentSsrService({
		constructor: this.constructor as CustomElementConstructor,
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
		return renderJsxToString(this.render(), options);
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

		try {
			hydrateJsx(this.render(), this);
		} finally {
			this.isRendering = false;
		}
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

			try {
				renderJsx(this.render(), this);
			} finally {
				this.isRendering = false;
			}
		}
	}

	protected override shouldAutoBindReactiveMembers(): boolean {
		return true;
	}

	protected getHostSsrAttributes(): Record<string, string> {
		return this.ssr.getHostAttributes();
	}
}
