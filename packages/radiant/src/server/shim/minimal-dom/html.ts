import {
	collectTopLevelHtmlFragments,
	parseHtmlTagToken,
	rawTextElementNames,
	voidElementNames,
	type ParsedHtmlTag,
} from '../../html/html-parser';
import { decodeHtmlEntities } from '../../../utils/decode-html-entities';
import { escapeHtmlText } from '../../../utils/escape-html-text';
import {
	getInstalledDocumentLike,
	MinimalElement,
	MinimalHtmlScriptElement,
	MinimalHTMLElement,
	MinimalNode,
	MinimalTextNode,
	registerMinimalDomHtmlParsers,
} from './nodes';

export { toDataAttributeName, toDatasetPropertyName } from './dataset';

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
		Object.entries(tag.attributes).map(([name, value]) => [name, decodeHtmlEntities(value)]),
	);
	element.setSerializedFragment(openTag, attributes, tag.innerHtml);
	return element as unknown as Node;
}

/**
 * Parses top-level HTML into minimal-DOM nodes.
 *
 * @remarks Text keeps its source HTML next to the decoded value. Comments and declarations become empty
 * text nodes that serialize their source unchanged. Stray close tags are dropped.
 */
export function parseHtmlToNodes(html: string, ownerDocument: Document | null = getInstalledDocumentLike()): Node[] {
	return collectTopLevelHtmlFragments(html).flatMap((fragment) => {
		const tag = fragment.startsWith('<') ? parseHtmlTagToken(fragment, 0) : undefined;

		if (tag?.type === 'close') {
			return [];
		}

		if (tag?.type === 'open') {
			return [createElementFromFragment(fragment, tag, ownerDocument)];
		}

		const text = tag ? '' : decodeHtmlEntities(fragment);
		return [new MinimalTextNode(text, ownerDocument, fragment) as unknown as Node];
	});
}

/**
 * @remarks Text inside `script` / `style` is emitted unescaped, as browsers serialize it, with only
 * `</script` / `</style` neutralized so the content cannot close its element early.
 */
export function serializeNodeHtml(node: Node): string {
	if (node.nodeType === MinimalNode.TEXT_NODE) {
		if (node instanceof MinimalTextNode && node.sourceHtml !== undefined) {
			return node.sourceHtml;
		}

		const text = node.textContent ?? '';
		const parentName = (node.parentNode as Partial<Element> | null)?.localName;

		return parentName && rawTextElementNames.has(parentName)
			? text.replace(/<\/(script|style)/gi, '<\\/$1')
			: escapeHtmlText(text);
	}

	return 'outerHTML' in node && typeof node.outerHTML === 'string'
		? node.outerHTML
		: escapeHtmlText(node.textContent ?? '');
}

registerMinimalDomHtmlParsers({
	parseHtmlToNodes,
	serializeNodeHtml,
});
