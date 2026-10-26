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
};

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

export function collectTopLevelHtmlFragments(html: string): string[] {
	const fragments: string[] = [];
	let index = 0;

	while (index < html.length) {
		const nextIndex = findTopLevelFragmentEnd(html, index);
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
function findTopLevelFragmentEnd(html: string, startIndex: number): number {
	if (html.startsWith('<!--', startIndex)) return findCommentEnd(html, startIndex);
	if (!isMarkupStart(html, startIndex)) return findTextEnd(html, startIndex + 1);
	const token = parseHtmlTagToken(html, startIndex, { includeInnerHtml: false });
	if (!token || token.type !== 'open' || token.selfClosing || voidElementNames.has(token.tagName)) {
		return token?.end ?? html.length;
	}

	return findElementCloseEnd(html, token.end, token.tagName);
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

function parseOpenTag(html: string, endIndex: number, rawToken: string, includeInnerHtml: boolean): ParsedHtmlTag {
	const selfClosing = /\/\s*$/.test(rawToken);
	const tagBody = selfClosing ? rawToken.replace(/\/\s*$/, '').trim() : rawToken;
	const tagName = tagBody.split(/[\s/>]/, 1)[0]?.toLowerCase() ?? '';
	const attributesStart = tagName.length;
	const rawAttributes = tagBody.slice(attributesStart).trim();
	const innerHtml =
		!includeInnerHtml || selfClosing || voidElementNames.has(tagName)
			? ''
			: extractInnerHtmlFragment(html, endIndex, tagName);

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

	return parseOpenTag(html, endIndex, rawToken, options.includeInnerHtml ?? true);
}

/**
 * Inner HTML between an open tag's `>` and its matching close, using a tag-name stack.
 *
 * @remarks Void and self-closing opens never push. Stray `</input>` closes are ignored.
 */
export function extractInnerHtmlFragment(html: string, openTagEndIndex: number, rootTagName: string): string {
	const bounds = findElementContentBounds(html, openTagEndIndex, rootTagName);
	return bounds ? html.slice(openTagEndIndex, bounds.closeTagStart) : html.slice(openTagEndIndex);
}

function findElementCloseEnd(html: string, openTagEndIndex: number, rootTagName: string): number {
	const bounds = findElementContentBounds(html, openTagEndIndex, rootTagName);
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

function findElementContentBounds(
	html: string,
	openTagEndIndex: number,
	rootTagName: string,
): ElementContentBounds | undefined {
	return isTextOnlyElement(rootTagName)
		? findRawTextContentBounds(html, openTagEndIndex, rootTagName)
		: findNestedContentBounds(html, openTagEndIndex, rootTagName);
}

function findNestedContentBounds(
	html: string,
	openTagEndIndex: number,
	rootTagName: string,
): ElementContentBounds | undefined {
	const stack = [rootTagName];
	let index = openTagEndIndex;

	while (index < html.length) {
		const nextTagIndex = html.indexOf('<', index);

		if (nextTagIndex === -1) {
			return undefined;
		}

		const token = parseHtmlTagToken(html, nextTagIndex, { includeInnerHtml: false });

		if (!token) {
			index = nextTagIndex + 1;
			continue;
		}

		if (token.type === 'close') {
			if (!voidElementNames.has(token.tagName) && token.tagName === stack[stack.length - 1]) {
				stack.pop();

				if (stack.length === 0) {
					return { closeTagStart: nextTagIndex, closeTagEnd: token.end };
				}
			}

			index = token.end;
			continue;
		}

		if (token.type === 'open' && isTextOnlyElement(token.tagName)) {
			index = findRawTextContentBounds(html, token.end, token.tagName)?.closeTagEnd ?? html.length;
			continue;
		}

		if (token.type === 'open' && !token.selfClosing && !voidElementNames.has(token.tagName)) {
			stack.push(token.tagName);
		}

		index = token.end;
	}

	return undefined;
}
