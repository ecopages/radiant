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
			type: 'close';
	  }
	| {
			end: number;
			type: 'comment' | 'declaration';
	  };

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
		const fragmentStart = index;

		if (html.startsWith('<!--', index)) {
			const commentEnd = html.indexOf('-->', index + 4);
			index = commentEnd === -1 ? html.length : commentEnd + 3;
			fragments.push(html.slice(fragmentStart, index));
			continue;
		}

		if (html[index] !== '<') {
			const nextTagIndex = html.indexOf('<', index);
			index = nextTagIndex === -1 ? html.length : nextTagIndex;
			fragments.push(html.slice(fragmentStart, index));
			continue;
		}

		const token = parseHtmlTagToken(html, index);

		if (!token) {
			fragments.push(html.slice(fragmentStart));
			break;
		}

		if (token.type !== 'open' || token.selfClosing || voidElementNames.has(token.tagName)) {
			index = token.end;
			fragments.push(html.slice(fragmentStart, index));
			continue;
		}

		index = token.end;
		let depth = 1;

		while (index < html.length && depth > 0) {
			const nextTagIndex = html.indexOf('<', index);

			if (nextTagIndex === -1) {
				index = html.length;
				break;
			}

			const nestedToken = parseHtmlTagToken(html, nextTagIndex);

			if (!nestedToken) {
				index = html.length;
				break;
			}

			index = nestedToken.end;

			if (nestedToken.type === 'comment' || nestedToken.type === 'declaration') {
				continue;
			}

			if (nestedToken.type === 'open' && !nestedToken.selfClosing && !voidElementNames.has(nestedToken.tagName)) {
				depth += 1;
				continue;
			}

			if (nestedToken.type === 'close') {
				depth -= 1;
			}
		}

		fragments.push(html.slice(fragmentStart, index));
	}

	return fragments.filter((fragment) => fragment !== '');
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
	const attributes: Record<string, string> = {};
	const attributePattern = /([:^@A-Za-z0-9_.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+)))?/g;

	for (const match of rawAttributes.matchAll(attributePattern)) {
		const [, name, doubleQuoted, singleQuoted, bareValue] = match;

		if (!name) {
			continue;
		}

		attributes[name] = doubleQuoted ?? singleQuoted ?? bareValue ?? '';
	}

	return attributes;
}

export function parseHtmlTagToken(html: string, startIndex: number): ParsedHtmlToken | undefined {
	if (html.startsWith('<!--', startIndex)) {
		const endIndex = html.indexOf('-->', startIndex + 4);
		return {
			end: endIndex === -1 ? html.length : endIndex + 3,
			type: 'comment',
		};
	}

	const endIndex = findHtmlTagEnd(html, startIndex);
	const rawToken = html.slice(startIndex + 1, endIndex - 1).trim();

	if (rawToken === '') {
		return undefined;
	}

	if (rawToken.startsWith('!') || rawToken.startsWith('?')) {
		return {
			end: endIndex,
			type: 'declaration',
		};
	}

	if (rawToken.startsWith('/')) {
		return {
			end: endIndex,
			type: 'close',
		};
	}

	const selfClosing = /\/\s*$/.test(rawToken);
	const tagBody = selfClosing ? rawToken.replace(/\/\s*$/, '').trim() : rawToken;
	const tagName = tagBody.split(/[\s/>]/, 1)[0]?.toLowerCase() ?? '';
	const attributesStart = tagName.length;
	const rawAttributes = tagBody.slice(attributesStart).trim();
	const innerHtml =
		selfClosing || voidElementNames.has(tagName)
			? ''
			: extractInnerHtmlFragment(html, startIndex, endIndex, tagName);

	return {
		attributes: parseAttributes(rawAttributes),
		end: endIndex,
		innerHtml,
		selfClosing,
		tagName,
		type: 'open',
	};
}

export function extractInnerHtmlFragment(
	html: string,
	startIndex: number,
	tagEndIndex: number,
	tagName: string,
): string {
	let index = tagEndIndex;
	let depth = 1;

	while (index < html.length && depth > 0) {
		const nextTagIndex = html.indexOf('<', index);

		if (nextTagIndex === -1) {
			return html.slice(tagEndIndex);
		}

		const nextTag = parseHtmlTagToken(html, nextTagIndex);

		if (!nextTag) {
			return html.slice(tagEndIndex);
		}

		if (
			nextTag.type === 'open' &&
			nextTag.tagName === tagName &&
			!nextTag.selfClosing &&
			!voidElementNames.has(tagName)
		) {
			depth += 1;
		}

		if (nextTag.type === 'close') {
			const closingName = html
				.slice(nextTagIndex + 2, nextTag.end - 1)
				.trim()
				.toLowerCase();

			if (closingName === tagName) {
				depth -= 1;

				if (depth === 0) {
					return html.slice(tagEndIndex, nextTagIndex);
				}
			}
		}

		index = nextTag.end;
	}

	return html.slice(tagEndIndex);
}
