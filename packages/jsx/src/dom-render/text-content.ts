export { endsWithTextContentOpenTag, stringifyTextContentValue } from '../factory/text-content-value.ts';

/**
 * Writes character data onto a text-content element.
 *
 * `textarea` children are default content, not a live controlled value. When the
 * authored string is unchanged, user edits in `.value` are left alone. A new
 * authored string writes both `.value` and `.defaultValue`.
 */
export function writeTextContentElement(element: Element, text: string): void {
	if (element instanceof HTMLTextAreaElement) {
		if (element.defaultValue !== text) {
			element.defaultValue = text;
			element.value = text;
		}

		return;
	}

	if (element.textContent !== text) {
		element.textContent = text;
	}
}
