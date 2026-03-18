import {
	hasHydrationMarkers,
	hydrate as hydrateJsx,
	render as renderJsx,
	renderToString as renderJsxToString,
	type JsxElement,
	type RenderToStringOptions,
} from '@ecopages/jsx';
import { RadiantComponentSsrService } from './radiant-component-ssr';
import { getReactivePropDefinitions } from './reactive-prop-metadata';
import { RadiantElement } from './radiant-element';

/**
 * A structured JSX-first Radiant base class.
 *
 * - `render()` describes the view.
 * - `update()` commits the current view into the host.
 * - first render happens automatically on connect.
 * - rerenders remain explicit through `update()` or decorators such as `@onUpdated`.
 */
export class RadiantComponent extends RadiantElement {
	private isRendering = false;
	private isFirstConnectPending = false;
	private needsRender = false;
	private readonly ssr = new RadiantComponentSsrService({
		constructor: this.constructor as CustomElementConstructor,
		renderToString: (options) => this.renderToString(options),
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
				this.hydrate();
				return;
			}

			this.update();
		});
	}

	/**
	 * Returns the current component view.
	 */
	public render(): JsxElement {
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
	public renderHost(): JsxElement {
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

	protected getHostSsrAttributes(): Record<string, string> {
		return this.ssr.getHostAttributes();
	}
}
