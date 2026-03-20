const AMPERSAND_CODE = 38;
const DOUBLE_QUOTE_CODE = 34;
const GREATER_THAN_CODE = 62;
const LESS_THAN_CODE = 60;

type BunHtmlEscaper = {
	escapeHTML(value: string): string;
};

const bunHtmlEscaper =
	typeof Bun !== 'undefined' && typeof (Bun as Partial<BunHtmlEscaper>).escapeHTML === 'function'
		? (Bun as BunHtmlEscaper)
		: undefined;

/**
 * Escapes text content for HTML output using a fast no-op path for strings that
 * contain no special characters.
 *
 * @param value Raw text content.
 * @returns Escaped HTML-safe text content.
 */
export function escapeHtml(value: string): string {
	if (bunHtmlEscaper) {
		return bunHtmlEscaper.escapeHTML(value);
	}

	let firstSpecialIndex = -1;

	for (let index = 0; index < value.length; index += 1) {
		const code = value.charCodeAt(index);

		if (code === AMPERSAND_CODE || code === LESS_THAN_CODE || code === GREATER_THAN_CODE) {
			firstSpecialIndex = index;
			break;
		}
	}

	if (firstSpecialIndex === -1) {
		return value;
	}

	let escaped = value.slice(0, firstSpecialIndex);

	for (let index = firstSpecialIndex; index < value.length; index += 1) {
		const code = value.charCodeAt(index);

		if (code === AMPERSAND_CODE) {
			escaped += '&amp;';
			continue;
		}

		if (code === LESS_THAN_CODE) {
			escaped += '&lt;';
			continue;
		}

		if (code === GREATER_THAN_CODE) {
			escaped += '&gt;';
			continue;
		}

		escaped += value[index] ?? '';
	}

	return escaped;
}

/**
 * Escapes an attribute value for HTML output using the same fast-path as text
 * escaping, while also encoding double quotes.
 *
 * @param value Raw attribute value.
 * @returns Escaped HTML-safe attribute value.
 */
export function escapeAttribute(value: string): string {
	if (bunHtmlEscaper) {
		return bunHtmlEscaper.escapeHTML(value);
	}

	let firstSpecialIndex = -1;

	for (let index = 0; index < value.length; index += 1) {
		const code = value.charCodeAt(index);

		if (
			code === AMPERSAND_CODE ||
			code === DOUBLE_QUOTE_CODE ||
			code === LESS_THAN_CODE ||
			code === GREATER_THAN_CODE
		) {
			firstSpecialIndex = index;
			break;
		}
	}

	if (firstSpecialIndex === -1) {
		return value;
	}

	let escaped = value.slice(0, firstSpecialIndex);

	for (let index = firstSpecialIndex; index < value.length; index += 1) {
		const code = value.charCodeAt(index);

		if (code === AMPERSAND_CODE) {
			escaped += '&amp;';
			continue;
		}

		if (code === DOUBLE_QUOTE_CODE) {
			escaped += '&quot;';
			continue;
		}

		if (code === LESS_THAN_CODE) {
			escaped += '&lt;';
			continue;
		}

		if (code === GREATER_THAN_CODE) {
			escaped += '&gt;';
			continue;
		}

		escaped += value[index] ?? '';
	}

	return escaped;
}
