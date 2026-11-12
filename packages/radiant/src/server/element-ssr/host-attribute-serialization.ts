import { reflectsBooleanAsValue, type ReactiveProperty } from '../../core/reactive-prop-core';
import { attributeNameForProp, type ReactivePropDefinition } from '../../core/reactive-prop-metadata';
import { writeAttributeValue, type AttributeTypeConstant } from '../../utils/attribute-utils';
import { warnOnceInDevelopment } from '../../helpers/dev-warnings';
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
 *    `undefined` and `null` are omitted. Boolean `false` is omitted unless the
 *    declared default is `true`, in which case `"false"` is emitted so upgrade
 *    can restore explicit false before hydration. When a boolean is written, the
 *    value is `"true"` or `"false"` — never a valueless HTML presence attribute.
 *    Do not style those attributes with bare `[name]`.
 *
 * 2. **Reactive prop definitions** — decorator-based definitions. Skipped when the
 *    target attribute name was already emitted by source 1 (dedup via `seenAttributes`).
 *    Uses the definition's `transform.toAttribute` when it has one, so a transform that returns null or an empty
 *    string omits the attribute, as in the property path above, instead of reflecting an empty list as `"[]"`, and `writeAttributeValue` for type-aware conversion otherwise.
 *
 * 3. **Authored attributes** — raw host-level attributes from the original markup.
 *    These always win if present, regardless of whether sources 1 or 2 already
 *    set the same name. This preserves explicit author intent in templates.
 *
 * @param host Host shape providing reactive state and attribute accessors.
 * @param tagName Tag name used in development warnings.
 * @returns Flat record of attribute name → serialized value.
 */
export function resolveHostAttributes(host: HostAttributeSource, tagName = 'host'): Record<string, string> {
	const attributes: Record<string, string> = {};
	const seenAttributes = new Set<string>();

	warnUnserializableProps(host, tagName);

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
 * Nullish runtime values are omitted. Boolean defaults follow {@link resolveHostAttributes}.
 */
function appendReactivePropertyAttributes(
	host: HostAttributeSource,
	attributes: Record<string, string>,
	seenAttributes: Set<string>,
): void {
	for (const property of host.getReactiveProperties()) {
		if (property.attribute === null) {
			continue;
		}

		const currentValue = host.getPropertyValue(property.name);
		if (shouldOmitReactivePropValue(currentValue, property.type, property.defaultValue)) {
			continue;
		}

		const serialized = property.converter.toAttribute(currentValue);
		if (serialized == null || serialized === '') {
			continue;
		}

		attributes[property.attribute] = String(serialized);
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
		const attributeName = attributeNameForProp(definition.name, definition.options);

		if (attributeName === null || seenAttributes.has(attributeName)) {
			continue;
		}

		const currentValue = host.getPropertyValue(definition.name);

		if (shouldOmitReactivePropValue(currentValue, definition.options.type, definition.options.defaultValue)) {
			continue;
		}

		const { transform, type } = definition.options;
		const serialized = transform?.toAttribute
			? transform.toAttribute(currentValue as never)
			: writeAttributeValue(currentValue, type);
		if (transform?.toAttribute && (serialized == null || serialized === '')) {
			continue;
		}

		attributes[attributeName] = String(serialized);
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

/**
 * Omits values that have no useful host-attribute representation.
 *
 * @remarks Boolean default handling follows {@link resolveHostAttributes}.
 */
function shouldOmitReactivePropValue(value: unknown, type: AttributeTypeConstant, defaultValue?: unknown): boolean {
	if (value === undefined || value === null) {
		return true;
	}

	if (value !== false) {
		return false;
	}

	return !reflectsBooleanAsValue({ type, defaultValue });
}

/**
 * Whether `JSON.stringify` keeps `value` as written: plain data without functions, class instances or cycles.
 */
function isJsonRepresentable(value: unknown, ancestors: object[] = []): boolean {
	if (typeof value === 'function' || typeof value === 'symbol') return false;
	if (typeof value !== 'object' || value === null) return true;
	if (ancestors.includes(value)) return false;
	if (typeof (value as { toJSON?: unknown }).toJSON === 'function') return true;

	const prototype = Object.getPrototypeOf(value);
	if (prototype !== null && prototype !== Object.prototype && prototype !== Array.prototype) return false;

	ancestors.push(value);
	const representable = Object.values(value).every((entry) => isJsonRepresentable(entry, ancestors));
	ancestors.pop();
	return representable;
}

/**
 * Warns in development when a prop that keeps its attribute would serialize a value JSON cannot represent.
 *
 * @remarks
 * Only the default `Object` and `Array` JSON writers are checked; a `transform.toAttribute` owns its own output.
 * The value is still serialized as before, so a class instance loses its methods on the client and a cycle makes
 * `JSON.stringify` throw. The warning fires once per tag and prop.
 */
function warnUnserializableProps(host: HostAttributeSource, tagName: string): void {
	for (const definition of host.getReactivePropDefinitions()) {
		const { type, transform } = definition.options;
		if (attributeNameForProp(definition.name, definition.options) === null || transform?.toAttribute) continue;
		if (type !== Object && type !== Array) continue;

		const value = host.getPropertyValue(definition.name);
		warnOnceInDevelopment(`ssr:${tagName}:${definition.name}`, () =>
			value != null && !isJsonRepresentable(value)
				? `[@ecopages/radiant] "${definition.name}" on <${tagName}> holds a value JSON cannot represent (a class instance, function or cycle), so server rendering would write a lossy attribute or throw. Declare the prop with \`attribute: false\` to keep it property-only.`
				: undefined,
		);
	}
}
