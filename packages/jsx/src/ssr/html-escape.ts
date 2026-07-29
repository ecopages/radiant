const AMPERSAND_CODE = 38;
const DOUBLE_QUOTE_CODE = 34;
const GREATER_THAN_CODE = 62;
const LESS_THAN_CODE = 60;

type BunHtmlEscaper = {
	escapeHTML(value: string): string;
};

const bunGlobal = (globalThis as typeof globalThis & { Bun?: Partial<BunHtmlEscaper> }).Bun;

const bunHtmlEscaper = typeof bunGlobal?.escapeHTML === 'function' ? (bunGlobal as BunHtmlEscaper) : undefined;

function escapeString(value: string, escapeQuotes: boolean): string {
	if (bunHtmlEscaper) {
		const escaped = bunHtmlEscaper.escapeHTML(value);

		// Bun.escapeHTML currently escapes quotes, but attribute escaping must not
		// depend on that remaining true if the Bun API drifts. Re-escape any
		// remaining `"` when building attribute values.
		return escapeQuotes ? escaped.replaceAll('"', '&quot;') : escaped;
	}

	let firstSpecialIndex = -1;

	for (let index = 0; index < value.length; index += 1) {
		const code = value.charCodeAt(index);

		if (
			code === AMPERSAND_CODE ||
			code === LESS_THAN_CODE ||
			code === GREATER_THAN_CODE ||
			(escapeQuotes && code === DOUBLE_QUOTE_CODE)
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

		if (escapeQuotes && code === DOUBLE_QUOTE_CODE) {
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

/**
 * Escapes text content for HTML output using a fast no-op path for strings that
 * contain no special characters.
 *
 * @param value Raw text content.
 * @returns Escaped HTML-safe text content.
 */
export function escapeHtml(value: string): string {
	return escapeString(value, false);
}

/**
 * Escapes an attribute value for HTML output using the same fast-path as text
 * escaping, while also encoding double quotes.
 *
 * @param value Raw attribute value.
 * @returns Escaped HTML-safe attribute value.
 */
export function escapeAttribute(value: string): string {
	return escapeString(value, true);
}
