import { escapeHtmlAttribute } from './escape-html-attribute';
import { assertValidHtmlAttributeName } from './html-names';

/**
 * Serializes one HTML attribute for safe interpolation into an opening tag.
 *
 * Empty / null / undefined values emit the boolean presence form ` name`.
 * Non-empty values emit ` name="escaped-value"`.
 */
export function serializeHtmlAttribute(name: string, value: string | null | undefined): string {
	assertValidHtmlAttributeName(name);

	if (value === '' || value === null || value === undefined) {
		return ` ${name}`;
	}

	return ` ${name}="${escapeHtmlAttribute(value)}"`;
}
