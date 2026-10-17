import type { JsxRenderable } from '@ecopages/jsx';
import { createMarkupNodeLike } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import { getCustomElementTagName } from '../../core/custom-element-metadata';
import { SERVER_RENDERED_HOST_ATTRIBUTE } from '../../core/server-rendered-host';
import { ensureLegacyHostReady } from '../../decorators/legacy/host-readiness';
import { assertValidHtmlTagName } from '../../utils/html-names';
import { withSsrContextProviders } from '../context-ssr';
import { alignMinimalDomHostTagName } from '../shim/minimal-dom/align-host-tag-name';
import { composeHostContent } from './host-script-composition';
import { resolveHostAttributes, stringifyHostAttributes } from './host-attribute-serialization';
import { toInternalRadiantSsrHost } from './radiant-element-ssr-extractor';
import type { InternalRadiantSsrHost } from '../../core/radiant-element-ssr-host';

export type RadiantElementViewRenderer = (host: InternalRadiantSsrHost, options?: RenderToStringOptions) => string;

function isHydrateMode(options: RenderToStringOptions): boolean {
	return options.mode === 'hydrate' || (options.mode === undefined && options.hydrate === true);
}

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
		this.ensureProvidersReady();
		this.host.prepareForSsr();
	}

	private ensureProvidersReady(): void {
		alignMinimalDomHostTagName(this.component, getCustomElementTagName(this.host.constructor));
		ensureLegacyHostReady(this.component, 'ssr');
	}

	/**
	 * Applies the host's JSX children as light DOM inside its context providers, before preparation.
	 *
	 * @remarks Consumers among the children resolve context while they serialize, so they see provider values
	 * set by construction or decorators. Values a provider only sets during `prepareForSsr` are not visible to
	 * them; preparation runs after so it still sees the children.
	 */
	public applyLightDom(apply: () => void): void {
		this.ensureProvidersReady();
		withSsrContextProviders(this.host.getContextProviders(), apply);
	}

	public renderHost(): JsxRenderable {
		this.ensureReady();

		return createMarkupNodeLike(this.renderHostToString({ mode: 'hydrate' }));
	}

	public renderHostToString(options: RenderToStringOptions = {}, attributes = this.getHostAttributes()): string {
		this.ensureReady();
		const tagName = this.getTagName();
		const hydrate = isHydrateMode(options);
		const hostAttributes = hydrate ? { ...attributes, [SERVER_RENDERED_HOST_ATTRIBUTE]: '' } : attributes;

		return withSsrContextProviders(
			this.host.getContextProviders(),
			() =>
				`<${tagName}${stringifyHostAttributes(hostAttributes)}>${this.renderHostContent(options, hydrate)}</${tagName}>`,
		);
	}

	public getHostAttributes(): Record<string, string> {
		this.ensureReady();
		return resolveHostAttributes(this.host);
	}

	private renderHostContent(options: RenderToStringOptions, hydrate: boolean): string {
		const hydrationScripts = hydrate
			? this.host
					.getHydrationBindings()
					.map((binding) => binding.renderHydrationScriptTag())
					.filter((markup): markup is string => typeof markup === 'string')
					.join('')
			: '';

		const hostContent = this.renderView(this.host, options);
		this.host.flushPostSyncCallbacks();

		return composeHostContent(
			{
				hostContent,
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
