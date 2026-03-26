import type { JsxRenderable, RenderToStringOptions } from '@ecopages/jsx';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import { withSsrContextProviders } from '../context/context-ssr';
import { getCustomElementTagName } from './custom-element-metadata';
import type { ReactiveProperty } from './radiant-element';
import type { ReactivePropDefinition } from './reactive-prop-metadata';
import { writeAttributeValue } from '../utils/attribute-utils';

type RadiantComponentSsrHost = {
	constructor: CustomElementConstructor;
	getContextProviders: () => SsrSerializableContextProvider[];
	getSlotProjectionScriptTag?: () => string | undefined;
	renderToString: (options?: RenderToStringOptions) => string;
	getReactiveProperties: () => ReactiveProperty[];
	getReactivePropDefinitions: () => ReactivePropDefinition[];
	getPropertyValue: (name: string) => unknown;
	listAttributeNames: () => string[];
	getAttributeValue: (name: string) => string | null;
};

export class RadiantComponentSsrService {
	constructor(private readonly host: RadiantComponentSsrHost) {}

	public renderHost(): JsxRenderable {
		return {
			nodeType: 1,
			outerHTML: this.renderHostToString({ hydrate: true }),
		};
	}

	public renderHostToString(options: RenderToStringOptions = {}, attributes = this.getHostAttributes()): string {
		const tagName = this.getTagName();
		const restoreSsrContexts = withSsrContextProviders(this.host.getContextProviders());

		try {
			return `<${tagName}${serializeHostAttributes(attributes)}>${this.renderHostContent(options)}</${tagName}>`;
		} finally {
			restoreSsrContexts();
		}
	}

	private renderHostContent(options: RenderToStringOptions): string {
		const hostContent = this.host.renderToString(options);
		const slotProjectionScript = this.host.getSlotProjectionScriptTag?.() ?? '';

		if (!options.hydrate) {
			return `${hostContent}${slotProjectionScript}`;
		}

		const hydrationScripts = this.host
			.getContextProviders()
			.map((provider) => provider.renderHydrationScriptTag())
			.filter((markup): markup is string => typeof markup === 'string')
			.join('');

		return `${hostContent}${slotProjectionScript}${hydrationScripts}`;
	}

	public getHostAttributes(): Record<string, string> {
		const attributes: Record<string, string> = {};
		const seenAttributes = new Set<string>();

		for (const property of this.host.getReactiveProperties()) {
			const currentValue = this.host.getPropertyValue(property.name);
			if (currentValue === undefined || currentValue === null || currentValue === false) {
				continue;
			}

			attributes[property.attribute] = String(property.converter.toAttribute(currentValue));
			seenAttributes.add(property.attribute);
		}

		for (const definition of this.host.getReactivePropDefinitions()) {
			const attributeName = definition.options.attribute ?? definition.name;

			if (seenAttributes.has(attributeName)) {
				continue;
			}

			const currentValue = this.host.getPropertyValue(definition.name);

			if (currentValue === undefined || currentValue === null || currentValue === false) {
				continue;
			}

			attributes[attributeName] = String(writeAttributeValue(currentValue, definition.options.type));
			seenAttributes.add(attributeName);
		}

		for (const attributeName of this.host.listAttributeNames()) {
			const attributeValue = this.host.getAttributeValue(attributeName);
			if (attributeValue !== null) {
				attributes[attributeName] = attributeValue;
			}
		}

		return attributes;
	}

	private getTagName(): string {
		const tagName = getCustomElementTagName(this.host.constructor);

		if (!tagName) {
			throw new Error(`${this.host.constructor.name} is missing @customElement metadata.`);
		}

		return tagName;
	}
}

function serializeHostAttributes(attributes: Record<string, string>): string {
	return Object.entries(attributes)
		.map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
		.join('');
}

function escapeAttribute(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
