import { collectTopLevelHtmlFragments, parseHtmlTagToken, type ParsedHtmlTag } from '../../html/html-parser';
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

	const isRawText = tag.tagName === 'script' || tag.tagName === 'style';
	const attributes = Object.fromEntries(
		Object.entries(tag.attributes).map(([name, value]) => [name, decodeHtmlEntities(value)]),
	);
	const text = extractTextContent(tag.innerHtml);

	element.setSerializedFragment(fragment, isRawText ? text : decodeHtmlEntities(text), attributes, tag.innerHtml);
	return element as unknown as Node;
}

export function extractTextContent(html: string): string {
	return html.replace(/<!--.*?-->/gs, '').replace(/<[^>]+>/g, '');
}

export function parseHtmlToNodes(html: string, ownerDocument: Document | null = getInstalledDocumentLike()): Node[] {
	return collectTopLevelHtmlFragments(html).flatMap((fragment) => {
		if (!fragment.startsWith('<')) {
			return [new MinimalTextNode(decodeHtmlEntities(fragment), ownerDocument) as unknown as Node];
		}

		const tag = parseHtmlTagToken(fragment, 0);

		if (tag?.type === 'close') {
			return [];
		}

		if (!tag || tag.type !== 'open') {
			return [new MinimalTextNode(decodeHtmlEntities(fragment), ownerDocument) as unknown as Node];
		}

		return [createElementFromFragment(fragment, tag, ownerDocument)];
	});
}

export function serializeNodeHtml(node: Node): string {
	if (node.nodeType === MinimalNode.TEXT_NODE) {
		return escapeHtmlText(node.textContent ?? '');
	}

	return 'outerHTML' in node && typeof node.outerHTML === 'string'
		? node.outerHTML
		: escapeHtmlText(node.textContent ?? '');
}

registerMinimalDomHtmlParsers({
	parseHtmlToNodes,
	serializeNodeHtml,
});
