/**
 * HTML attribute names that should keep boolean-attribute binding semantics
 * when authored without a prefix.
 */
const htmlBooleanAttributes = new Set([
	'allowfullscreen',
	'async',
	'autofocus',
	'autoplay',
	'checked',
	'controls',
	'default',
	'defer',
	'disabled',
	'formnovalidate',
	'hidden',
	'inert',
	'ismap',
	'itemscope',
	'loop',
	'multiple',
	'muted',
	'novalidate',
	'open',
	'playsinline',
	'readonly',
	'required',
	'reversed',
	'selected',
]);

/**
 * Unprefixed custom-element names that should still serialize as attributes by
 * default instead of falling through to property bindings.
 */
const customElementAttributeDefaults = new Set([
	'class',
	'dir',
	'hidden',
	'id',
	'lang',
	'part',
	'role',
	'slot',
	'style',
	'tabindex',
	'title',
]);

/** Returns whether `name` should use boolean-attribute binding semantics.
 *
 * @param name Attribute name in any casing.
 * @returns `true` for standard HTML boolean attributes such as `checked` or `disabled`.
 */
export function shouldUseBooleanAttributeBinding(name: string): boolean {
	return htmlBooleanAttributes.has(name.toLowerCase());
}

/**
 * Returns whether an unprefixed authored name should default to attribute
 * binding for the given element.
 *
 * @param elementName Lowercase tag name, including custom-element names with `-`.
 * @param name Authored attribute/property name.
 * @returns `true` when the binding should serialize as an attribute by default.
 */
export function shouldUseAttributeBindingByDefaultForElement(elementName: string, name: string): boolean {
	if (!elementName.includes('-')) {
		return true;
	}

	const normalizedName = name.toLowerCase();

	if (normalizedName.startsWith('aria-') || normalizedName.startsWith('data-')) {
		return true;
	}

	return customElementAttributeDefaults.has(normalizedName);
}
