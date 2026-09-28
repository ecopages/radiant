/** HTML / custom-element tag name: `div`, `button`, `my-element`, … */
const HTML_TAG_NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Attribute name safe for ` name="…"` interpolation (no spaces, quotes, or `>`). */
const HTML_ATTRIBUTE_NAME_PATTERN = /^[a-zA-Z_:][\w:.-]*$/;

/**
 * Normalizes and validates an HTML tag name for safe SSR string interpolation.
 * Rejects empty names and breakout payloads such as `div><img …`.
 */
export function assertValidHtmlTagName(tagName: string, label = 'tagName'): string {
	const normalizedTagName = tagName.trim().toLowerCase();

	if (!normalizedTagName) {
		throw new Error(`${label} is required.`);
	}

	if (!HTML_TAG_NAME_PATTERN.test(normalizedTagName)) {
		throw new Error(`Invalid ${label} "${tagName}". Expected an HTML or custom-element tag name.`);
	}

	return normalizedTagName;
}

/**
 * Validates an attribute name before interpolating it into HTML markup.
 */
export function assertValidHtmlAttributeName(name: string): string {
	if (!HTML_ATTRIBUTE_NAME_PATTERN.test(name)) {
		throw new Error(`Invalid HTML attribute name "${name}".`);
	}

	return name;
}
