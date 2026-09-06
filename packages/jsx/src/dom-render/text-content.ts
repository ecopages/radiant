import { isIterableRenderable, isJsxNodeLike, resolveReactiveSnapshot } from '../types/renderable-guards.ts';
import { unwrapKeyedValue } from './runtime-helpers.ts';

const OPEN_TAG_NAME_PATTERN = /<([a-z][a-z0-9-]*)(?:\s[^>]*)?>$/i;

/** Returns whether compiled HTML currently ends inside a text-content element's opening tag. */
export function endsWithTextContentOpenTag(html: string): boolean {
	const name = OPEN_TAG_NAME_PATTERN.exec(html)?.[1]?.toLowerCase();
	return name === 'textarea' || name === 'title' || name === 'style' || name === 'script';
}

/**
 * Flattens a JSX child value to the character data a text-content element should own.
 *
 * Nested templates contribute nothing: browsers treat markup inside `textarea`,
 * `title`, `style`, and `script` as text rather than a node tree.
 */
export function stringifyTextContentValue(value: unknown): string {
	const resolved = resolveReactiveSnapshot(unwrapKeyedValue(value));

	if (resolved == null || typeof resolved === 'boolean') {
		return '';
	}

	if (typeof resolved !== 'object') {
		return String(resolved);
	}

	if (isJsxNodeLike(resolved)) {
		return resolved.outerHTML ?? resolved.textContent ?? '';
	}

	if (!isIterableRenderable(resolved)) {
		return '';
	}

	let text = '';

	for (const child of resolved) {
		text += stringifyTextContentValue(child);
	}

	return text;
}

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
