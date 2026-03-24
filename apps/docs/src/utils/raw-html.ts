import type { JsxRenderable } from '@ecopages/jsx';

/** Wrap trusted serialized HTML so the Ecopages JSX renderer inserts it verbatim. */
export const rawHtml = (html: string): JsxRenderable => ({
	nodeType: 11,
	childNodes: [],
	outerHTML: html,
});