import {
	collectTopLevelHtmlFragments,
	escapableRawTextElementNames,
	leadingNewlineElementNames,
	parseHtmlTagToken,
	rawTextElementNames,
	voidElementNames,
	type ParsedHtmlTag,
} from '../../html/html-parser';
import { decodeHtmlAttribute, decodeHtmlText } from '../../../utils/decode-html-entities';
import { escapeHtmlText } from '../../../utils/escape-html-text';
import {
	getInstalledDocumentLike,
	MinimalCommentNode,
	MinimalElement,
	MinimalHtmlScriptElement,
	MinimalHTMLElement,
	MinimalNode,
	MinimalTextNode,
	registerMinimalDomHtmlParsers,
} from './nodes';

export { toDataAttributeName, toDatasetPropertyName } from './dataset';

/** The HTML input stream turns CR and CRLF into LF before tokenizing. */
function normalizeNewlines(value: string): string {
	return value.replace(/\r\n?/g, '\n');
}

export function createElementFromFragment(fragment: string, tag: ParsedHtmlTag, ownerDocument: Document | null): Node {
	const element =
		tag.tagName === 'script'
			? (new MinimalHtmlScriptElement(ownerDocument) as MinimalElement)
			: new MinimalHTMLElement(tag.tagName, ownerDocument);

	const sourceOpenTag = fragment.slice(0, tag.end);
	const openTag =
		tag.selfClosing && !voidElementNames.has(tag.tagName)
			? sourceOpenTag.replace(/\s*\/\s*>$/, '>')
			: sourceOpenTag;
	const attributes = Object.fromEntries(
		Object.entries(tag.attributes).map(([name, value]) => [name, decodeHtmlAttribute(normalizeNewlines(value))]),
	);
	element.setSerializedFragment(openTag, attributes, tag.innerHtml, !hasNestedSelfClosingTag(tag.innerHtml));
	return element as unknown as Node;
}

const SELF_CLOSING_OPEN_TAG_PATTERN = /<([a-z][^\s/>]*)(?:\s[^>]*)?\/>/gi;

/**
 * @remarks A self-closing tag is only an empty element when it is void or foreign. Browsers parse
 * `<x-card/>` as an open tag, so verbatim source that contains one would re-parse into a different tree.
 */
function hasNestedSelfClosingTag(innerHtml: string): boolean {
	for (const match of innerHtml.matchAll(SELF_CLOSING_OPEN_TAG_PATTERN)) {
		if (!voidElementNames.has((match[1] ?? '').toLowerCase())) return true;
	}

	return false;
}

/**
 * @remarks `<!-->` and `<!--->` are empty comments; an unterminated comment runs to the end of the input.
 */
function readCommentData(fragment: string): string {
	if (fragment.endsWith('>') && fragment.length < 7) return '';
	return normalizeNewlines(fragment.endsWith('-->') ? fragment.slice(4, -3) : fragment.slice(4));
}

/**
 * Parses one markup fragment from {@link collectTopLevelHtmlFragments}.
 *
 * @remarks Text keeps its source HTML next to the decoded value. `<!doctype>` is dropped and other `<!…>` /
 * `<?…>` declarations become comments, as when browsers parse a fragment. Stray close tags are dropped.
 */
function parseMarkupFragment(fragment: string, ownerDocument: Document | null): Node[] {
	const tag = fragment.startsWith('<') ? parseHtmlTagToken(fragment, 0) : undefined;

	switch (tag?.type) {
		case 'open':
			return [createElementFromFragment(fragment, tag, ownerDocument)];
		case 'close':
			return [];
		case 'comment':
			return [new MinimalCommentNode(readCommentData(fragment), ownerDocument) as unknown as Node];
		case 'declaration':
			return /^<!doctype/i.test(fragment)
				? []
				: [
						new MinimalCommentNode(
							normalizeNewlines(fragment.slice(fragment.startsWith('<?') ? 1 : 2, -1)),
							ownerDocument,
						) as unknown as Node,
					];
		default:
			return [
				new MinimalTextNode(
					decodeHtmlText(normalizeNewlines(fragment)),
					ownerDocument,
					fragment,
				) as unknown as Node,
			];
	}
}

function parseTextOnlyContent(html: string, contextTagName: string, ownerDocument: Document | null): Node[] {
	if (html === '') return [];

	const text = normalizeNewlines(html);
	const value = rawTextElementNames.has(contextTagName) ? text : decodeHtmlText(text);
	return [new MinimalTextNode(value, ownerDocument, html) as unknown as Node];
}

/** Joins text nodes left adjacent by dropped markup (`</>`, `<!doctype>`), as the HTML parser does. */
function mergeAdjacentText(nodes: Node[], ownerDocument: Document | null): Node[] {
	const merged: Node[] = [];

	for (const node of nodes) {
		const previous = merged[merged.length - 1];

		if (previous instanceof MinimalTextNode && node instanceof MinimalTextNode) {
			merged[merged.length - 1] = new MinimalTextNode(
				`${previous.textContent}${node.textContent}`,
				ownerDocument,
				`${previous.sourceHtml ?? ''}${node.sourceHtml ?? ''}`,
			) as unknown as Node;
		} else {
			merged.push(node);
		}
	}

	return merged;
}

/**
 * Parses HTML into minimal-DOM nodes, in the context of the element that will hold them.
 *
 * @param followsStartTag True when `html` is an element's source content, directly after its start tag
 * (materializing parsed children); false for `innerHTML` / `insertAdjacentHTML`, which parse a fragment.
 * @remarks Inside raw text (`script`, `style`, …) and escapable raw text (`textarea`, `title`), the content
 * is one text node. A newline directly after a `pre`, `listing` or `textarea` start tag is dropped; fragment
 * parsing keeps it, as in browsers.
 */
export function parseHtmlToNodes(
	html: string,
	ownerDocument: Document | null = getInstalledDocumentLike(),
	contextTagName = '',
	followsStartTag = false,
): Node[] {
	const nodes =
		rawTextElementNames.has(contextTagName) || escapableRawTextElementNames.has(contextTagName)
			? parseTextOnlyContent(html, contextTagName, ownerDocument)
			: mergeAdjacentText(
					collectTopLevelHtmlFragments(html).flatMap((fragment) =>
						parseMarkupFragment(fragment, ownerDocument),
					),
					ownerDocument,
				);
	const first = nodes[0];

	if (followsStartTag && leadingNewlineElementNames.has(contextTagName) && first instanceof MinimalTextNode) {
		const value = first.textContent;

		if (value === '\n') {
			nodes.shift();
		} else if (value.startsWith('\n')) {
			const source = first.sourceHtml?.replace(/^\r?\n|^\r/, '');
			nodes[0] = new MinimalTextNode(value.slice(1), ownerDocument, source) as unknown as Node;
		}
	}

	return nodes;
}

const AMBIGUOUS_SOURCE_END_PATTERN = /&[#a-z0-9]*$/i;
const faithfulSources = new WeakMap<MinimalTextNode, boolean>();

/**
 * @remarks Source text is only emitted when it spells the node's current value on its own: it decodes back to
 * the value (it may have moved out of a raw text parent), holds no `<` that could open markup, and does not
 * end in a partial character reference that a following text node could complete.
 */
function hasFaithfulSource(node: MinimalTextNode): boolean {
	const source = node.sourceHtml;
	if (source === undefined) return false;

	let faithful = faithfulSources.get(node);
	if (faithful === undefined) {
		faithful =
			!source.includes('<') &&
			!AMBIGUOUS_SOURCE_END_PATTERN.test(source) &&
			decodeHtmlText(normalizeNewlines(source)) === node.textContent;
		faithfulSources.set(node, faithful);
	}

	return faithful;
}

const SVG_HTML_INTEGRATION_POINTS = new Set(['foreignobject', 'desc', 'title']);

/**
 * Namespace the browser parses the children of `node` in.
 *
 * @remarks The minimal DOM has no namespaces, so this follows the tree construction rules from the root: `svg`
 * and `math` enter foreign content and their descendants inherit it. Only an SVG HTML integration point
 * (`foreignObject`, `desc`, `title` under `svg`) returns to HTML. Everything under `math` stays foreign, as in
 * the jsx string serializer: MathML text integration points such as `mi` still create `mglyph` and `malignmark`
 * as MathML, so treating their children as HTML would let raw text through. The cost is that text in
 * `math > mi > style` is entity-escaped, which never creates markup but is not decoded as CSS.
 */
function childContentNamespace(node: Node | null): 'html' | 'svg' | 'math' {
	if (node?.nodeType !== MinimalNode.ELEMENT_NODE) return 'html';

	const { localName } = node as Element;
	const namespace = childContentNamespace(node.parentNode);

	if (namespace === 'html') return localName === 'svg' || localName === 'math' ? localName : 'html';

	return namespace === 'svg' && SVG_HTML_INTEGRATION_POINTS.has(localName) ? 'html' : namespace;
}

/**
 * @remarks `script`, `style`, `xmp`, `iframe`, `noembed` and `noframes` hold raw text only in the HTML namespace.
 * Inside `svg` or `math` they are ordinary elements whose content the browser parses as markup.
 */
function isHtmlRawTextElement(node: Node | null): node is Element {
	return (
		node?.nodeType === MinimalNode.ELEMENT_NODE &&
		rawTextElementNames.has((node as Element).localName) &&
		childContentNamespace(node.parentNode) === 'html'
	);
}

/**
 * @remarks The HTML parser ends raw text only at `</{tag}` followed by whitespace, `/` or `>`, case-insensitive,
 * so that sequence is the only one rewritten and CSS such as `@media (width < 600px)` stays byte-identical.
 */
function escapeRawText(text: string, tagName: string): string {
	return text.replace(new RegExp(`</(?=${tagName}[\\s/>])`, 'gi'), '<\\/');
}

/**
 * @remarks A text node from parsed HTML is emitted from its source when that is faithful, so entities the
 * decoder does not need to rewrite keep their spelling. Text in an HTML raw text element is emitted unescaped,
 * as browsers serialize it, with only that element's closing tag rewritten. Everywhere else, including a `style`
 * or `xmp` inside `svg` or `math`, it is entity-escaped, which decodes back to the same text in foreign content.
 */
function serializeTextNode(node: Node): string {
	if (node instanceof MinimalTextNode && hasFaithfulSource(node)) {
		return node.sourceHtml as string;
	}

	const text = node.textContent ?? '';
	const parent = node.parentNode;

	return isHtmlRawTextElement(parent) ? escapeRawText(text, parent.localName) : escapeHtmlText(text);
}

export function serializeNodeHtml(node: Node): string {
	if (node.nodeType === MinimalNode.TEXT_NODE) {
		return serializeTextNode(node);
	}

	if (node.nodeType === MinimalNode.COMMENT_NODE) {
		return `<!--${node.textContent ?? ''}-->`;
	}

	const outerHtml = 'outerHTML' in node ? node.outerHTML : undefined;
	return typeof outerHtml === 'string' ? outerHtml : escapeHtmlText(node.textContent ?? '');
}

/**
 * @remarks The children of an HTML raw text element are joined before the closing tag is rewritten, so a
 * closing tag split across adjacent text nodes cannot end the element early.
 */
function serializeChildNodesHtml(parent: Node): string {
	const children = Array.from(parent.childNodes);

	if (!isHtmlRawTextElement(parent)) return children.map(serializeNodeHtml).join('');

	const text = children
		.map((child) => (child.nodeType === MinimalNode.TEXT_NODE ? (child.textContent ?? '') : serializeNodeHtml(child)))
		.join('');
	return escapeRawText(text, parent.localName);
}

/**
 * Parses HTML into child nodes of `context`, or of its parent for `insertAdjacentHTML` outside it.
 *
 * @remarks A raw-text tag name inside `svg` or `math` is an ordinary element there, so its content is parsed
 * as markup and character references decode, as in browsers. Its end is still found as for HTML raw text.
 */
function parseChildHtml(html: string, context: Node, followsStartTag = false): Node[] {
	const { localName } = context as Element;
	const contextTagName = rawTextElementNames.has(localName) && !isHtmlRawTextElement(context) ? '' : localName;
	return parseHtmlToNodes(html, context.ownerDocument, contextTagName, followsStartTag);
}

registerMinimalDomHtmlParsers({
	parseChildHtml,
	serializeChildNodesHtml,
});
