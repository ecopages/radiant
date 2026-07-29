import type { JsxRenderable } from '@ecopages/jsx';
import { createMarkupNodeLike } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import { getCustomElementTagName } from '../../core/custom-element-metadata';
import { runSsrPreparationCallbacks } from '../../core/ssr-preparation';
import { ensureLegacyHostReady } from '../../decorators/legacy/host-readiness';
import { assertValidHtmlTagName } from '../../utils/html-names';
import { withSsrContextProviders } from '../context-ssr';
import { alignMinimalDomHostTagName } from '../shim/minimal-dom/align-host-tag-name';
import { assertLightDomSsrSupported } from './assert-light-dom-ssr';
import { composeHostContent } from './host-script-composition';
import { resolveHostAttributes, stringifyHostAttributes } from './host-attribute-serialization';
import { toInternalRadiantSsrHost } from './radiant-element-ssr-extractor';
import type { InternalRadiantSsrHost } from '../../core/radiant-element-ssr-host';

export type RadiantElementViewRenderer = (host: InternalRadiantSsrHost, options?: RenderToStringOptions) => string;

export class RadiantElementSsrService {
	private readonly component: object;
	private readonly host: InternalRadiantSsrHost;
	private readonly renderView: RadiantElementViewRenderer;

	constructor(component: object, renderView: RadiantElementViewRenderer) {
		this.component = component;
		this.host = toInternalRadiantSsrHost(component);
		this.renderView = renderView;
	}

	private ensureReady(): void {
		assertLightDomSsrSupported(this.host);
		alignMinimalDomHostTagName(this.component, getCustomElementTagName(this.host.constructor));
		ensureLegacyHostReady(this.component, 'ssr');
		runSsrPreparationCallbacks(this.component);
	}

	public renderHost(): JsxRenderable {
		this.ensureReady();

		return createMarkupNodeLike(this.renderHostToString({ mode: 'hydrate' }));
	}

	public renderHostToString(options: RenderToStringOptions = {}, attributes = this.getHostAttributes()): string {
		this.ensureReady();
		const tagName = this.getTagName();

		return withSsrContextProviders(
			this.host.getContextProviders(),
			() => `<${tagName}${stringifyHostAttributes(attributes)}>${this.renderHostContent(options)}</${tagName}>`,
		);
	}

	public getHostAttributes(): Record<string, string> {
		this.ensureReady();
		return resolveHostAttributes(this.host);
	}

	private renderHostContent(options: RenderToStringOptions): string {
		const hydrate = options.mode === 'hydrate' || (options.mode === undefined && options.hydrate === true);

		const hydrationScripts = hydrate
			? this.host
					.getHydrationBindings()
					.map((binding) => binding.renderHydrationScriptTag())
					.filter((markup): markup is string => typeof markup === 'string')
					.join('')
			: '';

		return composeHostContent(
			{
				hostContent: this.renderView(this.host, options),
				authoredHydrationMarkup: this.host.getAuthoredHydrationScriptMarkup?.() ?? '',
				slotProjectionScript: this.host.getSlotProjectionScriptTag?.() ?? '',
				hydrationScripts,
			},
			hydrate,
		);
	}

	private getTagName(): string {
		const tagName = getCustomElementTagName(this.host.constructor);

		if (!tagName) {
			throw new Error(`${this.host.constructor.name} is missing @customElement metadata.`);
		}

		return assertValidHtmlTagName(tagName, `${this.host.constructor.name} custom element tagName`);
	}
}
