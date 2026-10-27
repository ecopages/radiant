import { RAW_TEXT_ELEMENT_NAMES } from '@ecopages/jsx/server';

export type ParsedHtmlTag = {
	attributes: Record<string, string>;
	end: number;
	innerHtml: string;
	selfClosing: boolean;
	tagName: string;
	type: 'open';
};

export type ParsedHtmlToken =
	| ParsedHtmlTag
	| {
			end: number;
			tagName: string;
			type: 'close';
	  }
	| {
			end: number;
			type: 'comment' | 'declaration';
	  };

export type ParseHtmlTagTokenOptions = {
	/** When false, open tags omit `innerHtml` (for linear stack walks). Default true. */
	includeInnerHtml?: boolean;
	/** Namespace the tag is parsed in, which decides how its `innerHtml` ends. Default `html`. */
	namespace?: ContentNamespace;
};

/** Namespace the HTML parser inserts elements in: HTML, or SVG and MathML foreign content. */
export type ContentNamespace = 'html' | 'svg' | 'math';

const SVG_HTML_INTEGRATION_POINTS = new Set(['foreignobject', 'desc', 'title']);
const CDATA_START = '<![CDATA[';

/**
 * Namespace the children of a `tagName` element are parsed in, given the namespace the element sits in.
 *
 * @remarks `svg` and `math` enter foreign content and their descendants inherit it. Only an SVG HTML integration
 * point (`foreignObject`, `desc`, `title` under `svg`) returns to HTML. Everything under `math` stays foreign, as
 * in the jsx string serializer: MathML text integration points such as `mi` still create `mglyph` and
 * `malignmark` as MathML, so treating their children as HTML would let raw text through. HTML tags that break
 * out of foreign content are not followed.
 */
export function childContentNamespace(namespace: ContentNamespace, tagName: string): ContentNamespace {
	if (namespace === 'html') return tagName === 'svg' || tagName === 'math' ? tagName : 'html';
	return namespace === 'svg' && SVG_HTML_INTEGRATION_POINTS.has(tagName) ? 'html' : namespace;
}

/** `script`, `style`, `textarea`, … hold text only in the HTML namespace; in foreign content they are ordinary elements. */
function isTextOnlyElementIn(namespace: ContentNamespace, tagName: string): boolean {
	return namespace === 'html' && isTextOnlyElement(tagName);
}

/** @remarks An unterminated CDATA section runs to the end of the input. */
function findCdataEnd(html: string, startIndex: number): number {
	const end = html.indexOf(']]>', startIndex + CDATA_START.length);
	return end === -1 ? html.length : end + 3;
}

/** A CDATA section is text in foreign content; in HTML, `<![CDATA[` starts a bogus comment. */
export function isCdataStart(html: string, index: number, namespace: ContentNamespace): boolean {
	return namespace !== 'html' && html.startsWith(CDATA_START, index);
}

export function readCdataText(fragment: string): string {
	return fragment.slice(CDATA_START.length, fragment.endsWith(']]>') ? -3 : undefined);
}

/** Raw text elements: content is text up to the matching close tag, never decoded or escaped. */
export const rawTextElementNames = RAW_TEXT_ELEMENT_NAMES;

/** Escapable raw text elements: content is text up to the matching close tag, with character references decoded. */
export const escapableRawTextElementNames = new Set(['textarea', 'title']);

/** Elements whose first newline after the start tag is dropped by the parser and restored by the serializer. */
export const leadingNewlineElementNames = new Set(['pre', 'listing', 'textarea']);

function isTextOnlyElement(tagName: string): boolean {
	return rawTextElementNames.has(tagName) || escapableRawTextElementNames.has(tagName);
}

export const voidElementNames = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
]);

/** @param namespace Namespace the content is parsed in. */
export function collectTopLevelHtmlFragments(html: string, namespace: ContentNamespace = 'html'): string[] {
	const fragments: string[] = [];
	let index = 0;

	while (index < html.length) {
		const nextIndex = findTopLevelFragmentEnd(html, index, namespace);
		fragments.push(html.slice(index, nextIndex));
		index = nextIndex;
	}

	return fragments.filter((fragment) => fragment !== '');
}

/**
 * Exclusive end index of the fragment that starts at `startIndex`.
 *
 * @remarks Open elements close on a matching tag name. A generic tag-depth count
 * treats a void `</input>` as closing an ancestor `<div>`, after which the leftover
 * `</div>` is parsed as a text node and shows up in the page.
 */
function findTopLevelFragmentEnd(html: string, startIndex: number, namespace: ContentNamespace): number {
	if (html.startsWith('<!--', startIndex)) return findCommentEnd(html, startIndex);
	if (isCdataStart(html, startIndex, namespace)) return findCdataEnd(html, startIndex);
	if (!isMarkupStart(html, startIndex)) return findTextEnd(html, startIndex + 1);
	const token = parseHtmlTagToken(html, startIndex, { includeInnerHtml: false });
	if (!token || token.type !== 'open' || token.selfClosing || voidElementNames.has(token.tagName)) {
		return token?.end ?? html.length;
	}

	return findElementCloseEnd(html, token.end, token.tagName, namespace);
}

/**
 * @remarks Searching from after `<!` lets `<!-->` and `<!--->` close as empty comments, as in browsers.
 */
function findCommentEnd(html: string, startIndex: number): number {
	const commentEnd = html.indexOf('-->', startIndex + 2);
	return commentEnd === -1 ? html.length : commentEnd + 3;
}

/**
 * @remarks As in the HTML tokenizer, `<` starts markup only before a letter, `/`, `!` or `?`;
 * otherwise (`a < b`) it is text.
 */
function isMarkupStart(html: string, index: number): boolean {
	return html.charAt(index) === '<' && /[A-Za-z/!?]/.test(html.charAt(index + 1));
}

function findTextEnd(html: string, startIndex: number): number {
	let index = html.indexOf('<', startIndex);

	while (index !== -1 && !isMarkupStart(html, index)) {
		index = html.indexOf('<', index + 1);
	}

	return index === -1 ? html.length : index;
}

/**
 * @remarks `<!…>`, `<?…>` and `</` followed by a non-letter are bogus comments ending at the first `>`;
 * `</>` is dropped, as in browsers.
 */
function parseBogusMarkup(html: string, startIndex: number): ParsedHtmlToken | undefined {
	const next = html.charAt(startIndex + 1);
	const afterSlash = html.charAt(startIndex + 2);

	if (next === '/' && /[A-Za-z]/.test(afterSlash)) return undefined;
	if (next !== '!' && next !== '?' && next !== '/') return undefined;
	if (next === '/' && afterSlash === '>') return { end: startIndex + 3, tagName: '', type: 'close' };

	const end = html.indexOf('>', startIndex);
	return { end: end === -1 ? html.length : end + 1, type: 'declaration' };
}

export function findHtmlTagEnd(html: string, startIndex: number): number {
	let quote: '"' | "'" | undefined;

	for (let index = startIndex + 1; index < html.length; index += 1) {
		const character = html[index];

		if (quote) {
			if (character === quote) {
				quote = undefined;
			}
			continue;
		}

		if (character === '"' || character === "'") {
			quote = character;
			continue;
		}

		if (character === '>') {
			return index + 1;
		}
	}

	return html.length;
}

export function parseAttributes(rawAttributes: string): Record<string, string> {
	const attributes: Record<string, string> = Object.create(null);
	const attributePattern = /([:^@A-Za-z0-9_.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/g;

	for (const match of rawAttributes.matchAll(attributePattern)) {
		const [, name, doubleQuoted, singleQuoted, bareValue] = match;

		if (!name || Object.hasOwn(attributes, name)) {
			continue;
		}

		attributes[name] = doubleQuoted ?? singleQuoted ?? bareValue ?? '';
	}

	return attributes;
}

function parseOpenTag(
	html: string,
	endIndex: number,
	rawToken: string,
	includeInnerHtml: boolean,
	namespace: ContentNamespace,
): ParsedHtmlTag {
	const selfClosing = /\/\s*$/.test(rawToken);
	const tagBody = selfClosing ? rawToken.replace(/\/\s*$/, '').trim() : rawToken;
	const tagName = tagBody.split(/[\s/>]/, 1)[0]?.toLowerCase() ?? '';
	const attributesStart = tagName.length;
	const rawAttributes = tagBody.slice(attributesStart).trim();
	const innerHtml =
		!includeInnerHtml || selfClosing || voidElementNames.has(tagName)
			? ''
			: extractInnerHtmlFragment(html, endIndex, tagName, namespace);

	return {
		attributes: parseAttributes(rawAttributes),
		end: endIndex,
		innerHtml,
		selfClosing,
		tagName,
		type: 'open',
	};
}

export function parseHtmlTagToken(
	html: string,
	startIndex: number,
	options: ParseHtmlTagTokenOptions = {},
): ParsedHtmlToken | undefined {
	if (html.startsWith('<!--', startIndex)) {
		return { end: findCommentEnd(html, startIndex), type: 'comment' };
	}

	if (!isMarkupStart(html, startIndex)) {
		return undefined;
	}

	const bogus = parseBogusMarkup(html, startIndex);

	if (bogus) {
		return bogus;
	}

	const endIndex = findHtmlTagEnd(html, startIndex);
	const rawToken = html.slice(startIndex + 1, endIndex - 1).trim();

	if (rawToken.startsWith('/')) {
		const tagName = rawToken.slice(1).trim().split(/[\s>]/, 1)[0]?.toLowerCase() ?? '';
		return {
			end: endIndex,
			tagName,
			type: 'close',
		};
	}

	return parseOpenTag(html, endIndex, rawToken, options.includeInnerHtml ?? true, options.namespace ?? 'html');
}

/**
 * Inner HTML between an open tag's `>` and its matching close, using a tag-name stack.
 *
 * @remarks Void and self-closing opens never push. Stray `</input>` closes are ignored.
 */
export function extractInnerHtmlFragment(
	html: string,
	openTagEndIndex: number,
	rootTagName: string,
	namespace: ContentNamespace = 'html',
): string {
	const bounds = findElementContentBounds(html, openTagEndIndex, rootTagName, namespace);
	return bounds ? html.slice(openTagEndIndex, bounds.closeTagStart) : html.slice(openTagEndIndex);
}

function findElementCloseEnd(
	html: string,
	openTagEndIndex: number,
	rootTagName: string,
	namespace: ContentNamespace,
): number {
	const bounds = findElementContentBounds(html, openTagEndIndex, rootTagName, namespace);
	return bounds ? bounds.closeTagEnd : html.length;
}

type ElementContentBounds = {
	closeTagEnd: number;
	closeTagStart: number;
};

/**
 * @remarks Raw text and escapable raw text (`script`, `textarea`, …) end at the first matching close tag,
 * as in browsers; markup-like strings inside are not tags.
 */
function findRawTextContentBounds(
	html: string,
	openTagEndIndex: number,
	tagName: string,
): ElementContentBounds | undefined {
	const closeTag = new RegExp(`</${tagName}[\\s/>]`, 'gi');
	closeTag.lastIndex = openTagEndIndex;
	const match = closeTag.exec(html);

	return match ? { closeTagStart: match.index, closeTagEnd: findHtmlTagEnd(html, match.index) } : undefined;
}

/** @param namespace Namespace the root element sits in. */
function findElementContentBounds(
	html: string,
	openTagEndIndex: number,
	rootTagName: string,
	namespace: ContentNamespace,
): ElementContentBounds | undefined {
	return isTextOnlyElementIn(namespace, rootTagName)
		? findRawTextContentBounds(html, openTagEndIndex, rootTagName)
		: findNestedContentBounds(html, openTagEndIndex, rootTagName, namespace);
}

function opensNestedElement(token: ParsedHtmlTag, namespace: ContentNamespace): boolean {
	return !token.selfClosing && !voidElementNames.has(token.tagName) && !isTextOnlyElementIn(namespace, token.tagName);
}

/** Index after an open tag where the scan resumes: past the content of an HTML text-only element. */
function scanIndexAfterOpenTag(html: string, token: ParsedHtmlTag, namespace: ContentNamespace): number {
	return isTextOnlyElementIn(namespace, token.tagName)
		? (findRawTextContentBounds(html, token.end, token.tagName)?.closeTagEnd ?? html.length)
		: token.end;
}

/**
 * @remarks Each open element records the namespace of its content, so a `style` inside `svg` nests like any
 * element and a CDATA section there is skipped as text, including any `</style>` it holds.
 */
function findNestedContentBounds(
	html: string,
	openTagEndIndex: number,
	rootTagName: string,
	rootNamespace: ContentNamespace,
): ElementContentBounds | undefined {
	const stack = [{ tagName: rootTagName, namespace: childContentNamespace(rootNamespace, rootTagName) }];
	let index = openTagEndIndex;

	while (index < html.length) {
		const nextTagIndex = html.indexOf('<', index);

		if (nextTagIndex === -1) {
			return undefined;
		}

		const namespace = stack.at(-1)?.namespace ?? 'html';

		if (isCdataStart(html, nextTagIndex, namespace)) {
			index = findCdataEnd(html, nextTagIndex);
			continue;
		}

		const token = parseHtmlTagToken(html, nextTagIndex, { includeInnerHtml: false });

		if (!token) {
			index = nextTagIndex + 1;
			continue;
		}

		if (token.type === 'open') {
			if (opensNestedElement(token, namespace)) {
				stack.push({ tagName: token.tagName, namespace: childContentNamespace(namespace, token.tagName) });
			}

			index = scanIndexAfterOpenTag(html, token, namespace);
			continue;
		}

		if (token.type === 'close' && token.tagName === stack.at(-1)?.tagName && !voidElementNames.has(token.tagName)) {
			stack.pop();

			if (stack.length === 0) {
				return { closeTagStart: nextTagIndex, closeTagEnd: token.end };
			}
		}

		index = token.end;
	}

	return undefined;
}
