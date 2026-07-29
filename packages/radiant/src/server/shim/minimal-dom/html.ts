import { collectTopLevelHtmlFragments, parseHtmlTagToken, type ParsedHtmlTag } from '../../html/html-parser';
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

	element.setSerializedFragment(fragment, extractTextContent(tag.innerHtml), tag.attributes, tag.innerHtml);
	return element as unknown as Node;
}

export function extractTextContent(html: string): string {
	return html.replace(/<!--.*?-->/gs, '').replace(/<[^>]+>/g, '');
}

export function parseHtmlToNodes(html: string, ownerDocument: Document | null = getInstalledDocumentLike()): Node[] {
	return collectTopLevelHtmlFragments(html).map((fragment) => {
		if (!fragment.startsWith('<')) {
			return new MinimalTextNode(fragment, ownerDocument) as unknown as Node;
		}

		const tag = parseHtmlTagToken(fragment, 0);

		if (!tag || tag.type !== 'open') {
			return new MinimalTextNode(fragment, ownerDocument) as unknown as Node;
		}

		return createElementFromFragment(fragment, tag, ownerDocument);
	});
}

export function serializeNodeHtml(node: Node): string {
	if (node.nodeType === MinimalNode.TEXT_NODE) {
		return escapeHtmlText(node.textContent ?? '');
	}

	return 'outerHTML' in node && typeof node.outerHTML === 'string' ? node.outerHTML : escapeHtmlText(node.textContent ?? '');
}

registerMinimalDomHtmlParsers({
	parseHtmlToNodes,
	serializeNodeHtml,
});
