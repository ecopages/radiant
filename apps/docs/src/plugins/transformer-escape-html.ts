import type { ShikiTransformer } from 'shiki';
import type { Element } from 'hast';

const escapeHtml = (value: string) =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');

/**
 * Custom Shiki transformer that escapes HTML entities in code block content.
 * Escapes the final text content after all other transformers have run.
 * It runs after other transformers to escape the final content.
 */
export const transformerEscapeHtml: ShikiTransformer = {
	name: 'escape-html',
	enforce: 'post',
	span(node) {
		escapeChildTextNodes(node);
	},
};

/**
 * Recursively escapes HTML entities in text nodes
 */
function escapeChildTextNodes(node: Element): void {
	if (!node.children) return;

	for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i];
		if (child.type === 'text' && typeof child.value === 'string') {
			child.value = escapeHtml(child.value);
		} else if (child.type === 'element') {
			escapeChildTextNodes(child);
		}
	}
}
