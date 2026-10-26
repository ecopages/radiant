import type { JsxRenderable } from '@ecopages/jsx';
import { CUSTOM_ELEMENT_CHILDREN_SYMBOL, createMarkupNodeLike } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import { getCustomElementTagName } from '@ecopages/jsx';
import { SERVER_RENDERED_AUTHORED_STAMP, SERVER_RENDERED_HOST_ATTRIBUTE } from '../../core/server-rendered-host';
import { ensureLegacyHostReady } from '../../decorators/legacy/host-readiness';
import { assertValidHtmlTagName } from '../../utils/html-names';
import { runWithSsrProviderStack, withSsrContextProviders } from '../context-ssr';
import { alignMinimalDomHostTagName } from '../shim/minimal-dom/align-host-tag-name';
import { createSlotProjectionScriptTag, hasNamedSlotNames } from '../../core/slot-projection-runtime';
import { composeHostContent } from './host-script-composition';
import { resolveHostAttributes, stringifyHostAttributes } from './host-attribute-serialization';
import { toInternalRadiantSsrHost } from './radiant-element-ssr-extractor';
import type { InternalRadiantSsrHost } from '../../core/radiant-element-ssr-host';

export type RadiantElementViewRenderer = (
	host: InternalRadiantSsrHost,
	options: RenderToStringOptions,
	beforeSerialize: () => void,
) => string;

function isHydrateMode(options: RenderToStringOptions): boolean {
	return options.mode === 'hydrate' || (options.mode === undefined && options.hydrate === true);
}

export class RadiantElementSsrService {
	private readonly component: object;
	private readonly host: InternalRadiantSsrHost;
	private readonly renderRawView: RadiantElementViewRenderer;

	constructor(component: object, renderRawView: RadiantElementViewRenderer) {
		this.component = component;
		this.host = toInternalRadiantSsrHost(component);
		this.renderRawView = renderRawView;
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
		return createMarkupNodeLike(this.renderHostToString({ mode: 'hydrate' }));
	}

	/** @remarks A host without a render lifecycle returns its `innerHTML` without preparation. */
	public renderPreparedViewToString(options: RenderToStringOptions = {}): string {
		return takesChildrenValue(this.host.constructor) ? this.renderView(options) : this.host.getInnerHTML();
	}

	/**
	 * @param attributeOverrides Merged after attributes are read from the prepared host, so a nested children stamp can replace the default host stamp.
	 * @remarks One pass: align the tag and legacy readiness, prepare, render the view, flush `@bindTo`, then read attributes, the slot-projection payload, and hydration bindings. A later serialization prepares again.
	 */
	public renderHostToString(
		options: RenderToStringOptions = {},
		attributeOverrides?: Record<string, string>,
	): string {
		const hostContent = takesChildrenValue(this.host.constructor)
			? this.renderView(options)
			: this.prepareWithoutView();
		const tagName = this.getTagName();
		const hydrate = isHydrateMode(options);

		const slotPayload = this.host.getProjectedSlotPayload?.();
		const slotProjectionMarkup =
			slotPayload !== undefined && this.host.resolveTrackedRenderOutput().containsSlots
				? createSlotProjectionScriptTag(slotPayload)
				: '';
		const authoredHydrationMarkup = this.host.getAuthoredHydrationScriptMarkup?.() ?? '';
		const hydrationScripts = hydrate
			? this.host
					.getHydrationBindings()
					.map((binding) => binding.renderHydrationScriptTag())
					.filter((markup): markup is string => typeof markup === 'string')
					.join('')
			: '';
		const attributes = {
			...this.readHostAttributes(),
			...attributeOverrides,
		};
		const stamp =
			takesChildrenValue(this.host.constructor) &&
			slotProjectionMarkup !== '' &&
			hasNamedSlotNames(slotPayload ?? {})
				? SERVER_RENDERED_AUTHORED_STAMP
				: '';
		const hostAttributes = hydrate
			? {
					...attributes,
					[SERVER_RENDERED_HOST_ATTRIBUTE]: attributes[SERVER_RENDERED_HOST_ATTRIBUTE] ?? stamp,
				}
			: attributes;
		const content = composeHostContent(
			{
				hostContent,
				authoredHydrationMarkup,
				slotProjectionScript: slotProjectionMarkup,
				hydrationScripts,
			},
			hydrate,
		);

		return `<${tagName}${stringifyHostAttributes(hostAttributes)}>${content}</${tagName}>`;
	}

	/**
	 * @remarks Prepares the host and flushes `@bindTo` once before reading its final attributes.
	 */
	public getHostAttributes(): Record<string, string> {
		this.prepareWithoutView();
		return this.readHostAttributes();
	}

	private prepareWithoutView(): string {
		this.ensureReady();
		this.host.flushPostSync();
		return this.host.getInnerHTML();
	}

	private renderView(options: RenderToStringOptions): string {
		this.ensureReady();
		return runWithSsrProviderStack(() =>
			withSsrContextProviders(this.host.getContextProviders(), () => {
				return this.renderRawView(this.host, options, () => this.host.flushPostSync());
			}),
		);
	}

	private readHostAttributes(): Record<string, string> {
		return resolveHostAttributes(this.host);
	}

	private getTagName(): string {
		const tagName = getCustomElementTagName(this.host.constructor);

		if (!tagName) {
			throw new Error(`${this.host.constructor.name} is missing @customElement metadata.`);
		}

		return assertValidHtmlTagName(tagName, `${this.host.constructor.name} custom element tagName`);
	}
}

/** @remarks Only a class that takes a Children Value from a view tells Authored Children apart in its stamp. */
function takesChildrenValue(constructor: object): boolean {
	return (constructor as { [CUSTOM_ELEMENT_CHILDREN_SYMBOL]?: unknown })[CUSTOM_ELEMENT_CHILDREN_SYMBOL] === true;
}
