import {
	childContentNamespace,
	collectTopLevelHtmlFragments,
	escapableRawTextElementNames,
	isCdataStart,
	leadingNewlineElementNames,
	parseHtmlTagToken,
	rawTextElementNames,
	readCdataText,
	voidElementNames,
	type ContentNamespace,
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
 * `<?…>` declarations become comments, as when browsers parse a fragment. Stray close tags are dropped. In
 * foreign content a CDATA section is text holding its content as written.
 */
function parseMarkupFragment(fragment: string, ownerDocument: Document | null, namespace: ContentNamespace): Node[] {
	if (isCdataStart(fragment, 0, namespace)) {
		return [
			new MinimalTextNode(normalizeNewlines(readCdataText(fragment)), ownerDocument, fragment) as unknown as Node,
		];
	}

	const tag = fragment.startsWith('<') ? parseHtmlTagToken(fragment, 0, { namespace }) : undefined;

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

/** Joins text nodes left adjacent by dropped markup (`</>`, `<!doctype>`) or CDATA, as the HTML parser does. */
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
 * @param namespace Namespace the content is parsed in: `svg` or `math` inside foreign content.
 * @remarks Inside raw text (`script`, `style`, …) and escapable raw text (`textarea`, `title`), the content
 * is one text node. A newline directly after a `pre`, `listing` or `textarea` start tag is dropped; fragment
 * parsing keeps it, as in browsers.
 */
export function parseHtmlToNodes(
	html: string,
	ownerDocument: Document | null = getInstalledDocumentLike(),
	contextTagName = '',
	followsStartTag = false,
	namespace: ContentNamespace = 'html',
): Node[] {
	const nodes =
		rawTextElementNames.has(contextTagName) || escapableRawTextElementNames.has(contextTagName)
			? parseTextOnlyContent(html, contextTagName, ownerDocument)
			: mergeAdjacentText(
					collectTopLevelHtmlFragments(html, namespace).flatMap((fragment) =>
						parseMarkupFragment(fragment, ownerDocument, namespace),
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

const detachedRootNamespaces = new WeakMap<Node, ContentNamespace>();

/**
 * Records the namespace a parentless node's markup is inserted in, so its subtree serializes as the browser
 * will parse it there.
 *
 * @remarks A custom-element host is serialized on its own, detached from the page around it. When that page
 * puts it inside `svg` or `math`, its content is foreign there, so a `style` in its light DOM must be escaped.
 * The hint is read only while `root` has no parent.
 */
export function setDetachedRootNamespace(root: Node, namespace: ContentNamespace): void {
	detachedRootNamespaces.set(root, namespace);
}

const namespaceOverrides = new WeakMap<Node, ContentNamespace>();

/**
 * Serializes `node` as the browser parses it in `namespace`, whatever its DOM parent.
 *
 * @remarks A slotted light-DOM node sits under its host, in HTML, but is emitted where the host's view puts it, which
 * can be inside `svg` or `math`. Its subtree is first built and stripped of the source HTML kept from parsing it, since
 * that source spells the content for the context it was parsed in.
 */
export function serializeNodeInNamespace(node: Node, namespace: ContentNamespace): string {
	dropParsedSource(node);
	namespaceOverrides.set(node, namespace);
	try {
		return serializeNodeHtml(node);
	} finally {
		namespaceOverrides.delete(node);
	}
}

function dropParsedSource(node: Node): void {
	if (node instanceof MinimalElement) node.invalidateSerialization();
	for (const child of Array.from(node.childNodes)) dropParsedSource(child);
}

/**
 * Namespace the browser parses `node` itself in: an override from {@link serializeNodeInNamespace}, its parent's
 * content namespace, or a detached root's hint.
 */
function namespaceOf(node: Node): ContentNamespace {
	return (
		namespaceOverrides.get(node) ??
		(node.parentNode ? contentNamespaceOf(node.parentNode) : (detachedRootNamespaces.get(node) ?? 'html'))
	);
}

/**
 * Namespace the browser parses the children of `node` in.
 *
 * @remarks The minimal DOM keeps no namespaces, so this applies {@link childContentNamespace} from the root.
 * Text in `math > mi > style` is therefore entity-escaped: it never creates markup, but it is not read as CSS.
 */
function contentNamespaceOf(node: Node): ContentNamespace {
	if (node.nodeType !== MinimalNode.ELEMENT_NODE) return 'html';
	return childContentNamespace(namespaceOf(node), (node as Element).localName);
}

/**
 * @remarks `script`, `style`, `xmp`, `iframe`, `noembed` and `noframes` hold raw text only in the HTML namespace.
 * Inside `svg` or `math` they are ordinary elements whose content the browser parses as markup.
 */
function isHtmlRawTextElement(node: Node | null): node is Element {
	return (
		node?.nodeType === MinimalNode.ELEMENT_NODE &&
		rawTextElementNames.has((node as Element).localName) &&
		namespaceOf(node) === 'html'
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
		.map((child) =>
			child.nodeType === MinimalNode.TEXT_NODE ? (child.textContent ?? '') : serializeNodeHtml(child),
		)
		.join('');
	return escapeRawText(text, parent.localName);
}

/**
 * Parses HTML into child nodes of `context`, or of its parent for `insertAdjacentHTML` outside it.
 *
 * @remarks A raw-text tag name inside `svg` or `math` is an ordinary element there, so its content is parsed
 * as markup, with character references decoded and CDATA sections read as text, as in browsers.
 */
function parseChildHtml(html: string, context: Node, followsStartTag = false): Node[] {
	const { localName } = context as Element;
	const namespace = namespaceOf(context);
	const contextTagName = namespace === 'html' ? localName : '';
	return parseHtmlToNodes(
		html,
		context.ownerDocument,
		contextTagName,
		followsStartTag,
		childContentNamespace(namespace, localName),
	);
}

registerMinimalDomHtmlParsers({
	parseChildHtml,
	serializeChildNodesHtml,
});
