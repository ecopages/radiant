import type { ShikiTransformer } from 'shiki';
import type { Element } from 'hast';

const escapeHtml = (value: string) =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');

/** Escapes HTML entities in Shiki code block spans after other transformers run. */
export const transformerEscapeHtml: ShikiTransformer = {
	name: 'escape-html',
	enforce: 'post',
	span(node) {
		escapeChildTextNodes(node);
	},
};

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
