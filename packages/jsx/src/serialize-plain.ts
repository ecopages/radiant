import { serializeRenderable } from './serialize-renderable.ts';
import type { JsxRenderable } from './types.ts';

/**
 * Eagerly serializes a JSX child value to an HTML string.
 *
 * Used by custom-element SSR fallbacks. Does not emit hydration markers; for full
 * SSR output, use `renderToString` from the server-render module instead.
 *
 * @param value JSX child value to serialize.
 * @returns HTML string representing the child, with user-provided text content escaped.
 */
export function renderJsxRenderableToString(value: JsxRenderable | undefined): string {
	return serializeRenderable(value, { mode: 'plain' });
}
