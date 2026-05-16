import type { JsxRenderable } from '@ecopages/jsx';
import type { RenderToStringOptions } from '@ecopages/jsx/server';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import { withSsrContextProviders } from '../server/context-ssr';
import { getCustomElementTagName } from './custom-element-metadata';
import type { ReactiveProperty } from './reactive-prop-core';
import type { ReactivePropDefinition } from './reactive-prop-metadata';
import type { SsrSerializableHydrationBinding } from './ssr-hydration-binding';
import { resolveHostAttributes, stringifyHostAttributes } from '../server/host-attribute-serialization';
import { composeHostContent } from '../server/host-script-composition';

export type RadiantElementSsrHost = {
	constructor: CustomElementConstructor;
	getAuthoredHydrationScriptMarkup?: () => string | undefined;
	getContextProviders: () => SsrSerializableContextProvider[];
	getHydrationBindings: () => SsrSerializableHydrationBinding[];
	getSlotProjectionScriptTag?: () => string | undefined;
	renderViewToString: (options?: RenderToStringOptions) => string;
	getReactiveProperties: () => ReactiveProperty[];
	getReactivePropDefinitions: () => ReactivePropDefinition[];
	getPropertyValue: (name: string) => unknown;
	listAttributeNames: () => string[];
	getAttributeValue: (name: string) => string | null;
};

export class RadiantElementSsrService {
	constructor(private readonly host: RadiantElementSsrHost) {}

	public renderHost(): JsxRenderable {
		return {
			nodeType: 1,
			outerHTML: this.renderHostToString({ mode: 'hydrate' }),
		};
	}

	public renderHostToString(options: RenderToStringOptions = {}, attributes = this.getHostAttributes()): string {
		const tagName = this.getTagName();
		const restoreSsrContexts = withSsrContextProviders(this.host.getContextProviders());

		try {
			return `<${tagName}${stringifyHostAttributes(attributes)}>${this.renderHostContent(options)}</${tagName}>`;
		} finally {
			restoreSsrContexts();
		}
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
				hostContent: this.host.renderViewToString(options),
				authoredHydrationMarkup: this.host.getAuthoredHydrationScriptMarkup?.() ?? '',
				slotProjectionScript: this.host.getSlotProjectionScriptTag?.() ?? '',
				hydrationScripts,
			},
			hydrate,
		);
	}

	public getHostAttributes(): Record<string, string> {
		return resolveHostAttributes(this.host);
	}

	private getTagName(): string {
		const tagName = getCustomElementTagName(this.host.constructor);

		if (!tagName) {
			throw new Error(`${this.host.constructor.name} is missing @customElement metadata.`);
		}

		return tagName;
	}
}
