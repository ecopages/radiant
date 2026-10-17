import {
	isIterableRenderable,
	isJsxNodeLike,
	isKeyedJsxValue,
	resolveReactiveSnapshot,
} from '../types/renderable-guards.ts';

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
	const resolved = resolveReactiveSnapshot(isKeyedJsxValue(value) ? value.value : value);

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
