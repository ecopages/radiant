const NAMED_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	copy: '©',
	reg: '®',
	ndash: '–',
	mdash: '—',
	hellip: '…',
};

const REPLACEMENT_CHARACTER = '�';

/**
 * Inverse of `escapeHtmlText` / `escapeHtmlAttribute`, plus numeric references.
 *
 * @remarks Decodes a single pass, so `&amp;lt;` becomes `&lt;`. Only the entities in the table above are known;
 * other named entities are left untouched. Invalid numeric references (NUL, surrogates, past U+10FFFF)
 * become U+FFFD, as in the HTML spec.
 */
export function decodeHtmlEntities(value: string): string {
	return value.replace(/&(?:#(\d+)|#x([\da-f]+)|(\w+));/gi, (match, dec, hex, name) => {
		if (name) return NAMED_ENTITIES[name.toLowerCase()] ?? match;
		const codePoint = dec ? Number(dec) : Number.parseInt(hex, 16);
		const isInvalid = codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff);
		return isInvalid ? REPLACEMENT_CHARACTER : String.fromCodePoint(codePoint);
	});
}
