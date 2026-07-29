import type { ReactiveProperty } from '../../core/reactive-prop-core';
import type { ReactivePropDefinition } from '../../core/reactive-prop-metadata';
import { writeAttributeValue } from '../../utils/attribute-utils';
import { serializeHtmlAttribute } from '../../utils/serialize-html-attribute';

/**
 * Minimal host shape needed by the attribute serialization policy.
 *
 * This interface defines the narrow contract that the serialization module
 * consumes, keeping it independent of the full {@link RadiantElementSsrHost}.
 */
export type HostAttributeSource = {
	getReactiveProperties: () => ReactiveProperty[];
	getReactivePropDefinitions: () => ReactivePropDefinition[];
	getPropertyValue: (name: string) => unknown;
	getAttributeNames: () => string[];
	getAttribute: (name: string) => string | null;
};

/**
 * Resolves the final set of SSR host attributes from a Radiant Element Host.
 *
 * ## Source precedence (highest to lowest)
 *
 * 1. **Reactive properties** — legacy attribute reflection via `property.converter`.
 *    These are already-registered reactive properties with established converters.
 *    Falsy values (`undefined`, `null`, `false`) are omitted.
 *
 * 2. **Reactive prop definitions** — decorator-based definitions. Skipped when the
 *    target attribute name was already emitted by source 1 (dedup via `seenAttributes`).
 *    Uses `writeAttributeValue` for type-aware conversion.
 *
 * 3. **Authored attributes** — raw host-level attributes from the original markup.
 *    These always win if present, regardless of whether sources 1 or 2 already
 *    set the same name. This preserves explicit author intent in templates.
 *
 * @param host Host shape providing reactive state and attribute accessors.
 * @returns Flat record of attribute name → serialized value.
 */
export function resolveHostAttributes(host: HostAttributeSource): Record<string, string> {
	const attributes: Record<string, string> = {};
	const seenAttributes = new Set<string>();

	appendReactivePropertyAttributes(host, attributes, seenAttributes);
	appendReactivePropDefinitionAttributes(host, attributes, seenAttributes);
	appendAuthoredAttributes(host, attributes);

	return attributes;
}

/**
 * Serializes a flat attribute record into an HTML attribute string.
 *
 * Each entry is formatted by {@link serializeHtmlAttribute} (boolean presence
 * form for empty values, quoted escaped values otherwise). The combined string
 * is safe for direct interpolation into an opening tag.
 *
 * @param attributes Flat attribute record to serialize.
 * @returns HTML attribute string.
 */
export function stringifyHostAttributes(attributes: Record<string, string>): string {
	return Object.entries(attributes)
		.map(([name, value]) => serializeHtmlAttribute(name, value))
		.join('');
}

/**
 * Source 1: Reactive properties with established converters.
 *
 * Falsy runtime values are omitted — they should not appear as attributes
 * in SSR output.
 */
function appendReactivePropertyAttributes(
	host: HostAttributeSource,
	attributes: Record<string, string>,
	seenAttributes: Set<string>,
): void {
	for (const property of host.getReactiveProperties()) {
		const currentValue = host.getPropertyValue(property.name);
		if (currentValue === undefined || currentValue === null || currentValue === false) {
			continue;
		}

		attributes[property.attribute] = String(property.converter.toAttribute(currentValue));
		seenAttributes.add(property.attribute);
	}
}

/**
 * Source 2: Decorator-based reactive prop definitions.
 *
 * Skipped when the attribute name was already emitted by source 1, preventing
 * duplicate or conflicting attribute values.
 */
function appendReactivePropDefinitionAttributes(
	host: HostAttributeSource,
	attributes: Record<string, string>,
	seenAttributes: Set<string>,
): void {
	for (const definition of host.getReactivePropDefinitions()) {
		const attributeName = definition.options.attribute ?? definition.name;

		if (seenAttributes.has(attributeName)) {
			continue;
		}

		const currentValue = host.getPropertyValue(definition.name);

		if (currentValue === undefined || currentValue === null || currentValue === false) {
			continue;
		}

		attributes[attributeName] = String(writeAttributeValue(currentValue, definition.options.type));
		seenAttributes.add(attributeName);
	}
}

/**
 * Source 3: Authored attributes from the original markup.
 *
 * These always overwrite — when an author explicitly sets an attribute in
 * markup, that intent takes precedence over reactive property reflection.
 */
function appendAuthoredAttributes(host: HostAttributeSource, attributes: Record<string, string>): void {
	for (const attributeName of host.getAttributeNames()) {
		const attributeValue = host.getAttribute(attributeName);
		if (attributeValue !== null) {
			attributes[attributeName] = attributeValue;
		}
	}
}
