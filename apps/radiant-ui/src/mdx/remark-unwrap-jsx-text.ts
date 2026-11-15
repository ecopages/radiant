import type { Plugin } from 'unified';

type MdastNode = { type: string; name?: string | null; children?: MdastNode[] };

/** Elements whose content is text, so a paragraph inside one is never wanted. */
const TEXT_ELEMENTS = new Set([
	'p',
	'span',
	'a',
	'button',
	'label',
	'li',
	'dt',
	'dd',
	'td',
	'th',
	'summary',
	'legend',
	'figcaption',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
]);

export function unwrapJsxText(node: MdastNode): void {
	if (!node.children) return;
	if (node.type === 'mdxJsxFlowElement' && node.name && TEXT_ELEMENTS.has(node.name)) {
		const [only] = node.children;
		if (node.children.length === 1 && only?.type === 'paragraph') {
			node.children = only.children ?? [];
		}
	}
	for (const child of node.children) unwrapJsxText(child);
}

/**
 * Keeps text written on its own line inside a text element as that element's content.
 *
 * @remarks
 * MDX reads text on its own line as markdown, so `<button>` followed by a line of text becomes
 * `<button><p>text</p></button>`. Prettier moves the text of any JSX element that does not fit its line to its own
 * line, so a page cannot keep it inline by hand: `<p data-status>Dialog closed</p>` rendered as an empty status
 * element followed by a loose `<p>Dialog closed</p>`, which showed the message twice once a script wrote to the
 * status. Only a single paragraph in an element that holds text is unwrapped; blank-line separated paragraphs stay.
 */
export const remarkUnwrapJsxText: Plugin<[], MdastNode> = () => (tree) => unwrapJsxText(tree);
