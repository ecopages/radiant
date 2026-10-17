import { LEGACY_ENTITY_NAMES, NAMED_ENTITY_DATA } from './html-entity-table.generated';

const REPLACEMENT_CHARACTER = '�';

/** Numeric references in the C1 range map to Windows-1252 characters, per the HTML spec. */
const C1_REPLACEMENTS: Record<number, number> = {
	0x80: 0x20ac,
	0x82: 0x201a,
	0x83: 0x0192,
	0x84: 0x201e,
	0x85: 0x2026,
	0x86: 0x2020,
	0x87: 0x2021,
	0x88: 0x02c6,
	0x89: 0x2030,
	0x8a: 0x0160,
	0x8b: 0x2039,
	0x8c: 0x0152,
	0x8e: 0x017d,
	0x91: 0x2018,
	0x92: 0x2019,
	0x93: 0x201c,
	0x94: 0x201d,
	0x95: 0x2022,
	0x96: 0x2013,
	0x97: 0x2014,
	0x98: 0x02dc,
	0x99: 0x2122,
	0x9a: 0x0161,
	0x9b: 0x203a,
	0x9c: 0x0153,
	0x9e: 0x017e,
	0x9f: 0x0178,
};

const REFERENCE_PATTERN = /&(?:#[xX]([\da-fA-F]+);?|#(\d+);?|([A-Za-z][A-Za-z\d]*)(;?))/g;

let namedEntities: Map<string, string> | undefined;
let legacyNames: Set<string> | undefined;

function getNamedEntities(): Map<string, string> {
	if (namedEntities) return namedEntities;

	namedEntities = new Map();
	let previous = '';

	for (const entry of NAMED_ENTITY_DATA.split(';')) {
		const separator = entry.indexOf(':');
		const name = `${previous.slice(0, Number.parseInt(entry.charAt(0), 36))}${entry.slice(1, separator)}`;
		const codePoints = entry
			.slice(separator + 1)
			.split('.')
			.map((codePoint) => Number.parseInt(codePoint, 36));

		namedEntities.set(name, String.fromCodePoint(...codePoints));
		previous = name;
	}

	return namedEntities;
}

function getLegacyNames(): Set<string> {
	legacyNames ??= new Set(LEGACY_ENTITY_NAMES.split(' '));
	return legacyNames;
}

function decodeNumericReference(codePoint: number): string {
	if (codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
		return REPLACEMENT_CHARACTER;
	}

	return String.fromCodePoint(C1_REPLACEMENTS[codePoint] ?? codePoint);
}

/**
 * @remarks Without a semicolon, only legacy names decode, matched as the longest prefix of the name run
 * (`&notit;` is `¬it;`). In attributes, such a match followed by `=` or an alphanumeric stays literal, so
 * query strings like `?a=1&copy=2` survive.
 */
function decodeNamedReference(
	reference: string,
	name: string,
	semicolon: string,
	nextCharacter: string,
	attribute: boolean,
): string {
	const entities = getNamedEntities();
	const withSemicolon = semicolon ? entities.get(name) : undefined;

	if (withSemicolon !== undefined) return withSemicolon;

	const legacy = getLegacyNames();

	for (let length = name.length; length > 0; length -= 1) {
		const prefix = name.slice(0, length);

		if (!legacy.has(prefix)) continue;

		const following = length < name.length ? name.charAt(length) : semicolon || nextCharacter;

		if (attribute && /^[=A-Za-z\d]$/.test(following)) return reference;

		return `${entities.get(prefix)}${name.slice(length)}${semicolon}`;
	}

	return reference;
}

function decode(value: string, attribute: boolean): string {
	if (!value.includes('&')) return value;

	return value.replace(
		REFERENCE_PATTERN,
		(reference: string, hex?: string, decimal?: string, name?: string, semicolon = '', offset = 0) => {
			if (hex !== undefined) return decodeNumericReference(Number.parseInt(hex, 16));
			if (decimal !== undefined) return decodeNumericReference(Number.parseInt(decimal, 10));

			const nextCharacter = value.charAt(offset + reference.length);
			return decodeNamedReference(reference, name ?? '', semicolon, nextCharacter, attribute);
		},
	);
}

/** Decodes character references in HTML text content, as the HTML tokenizer does. */
export function decodeHtmlText(value: string): string {
	return decode(value, false);
}

/** Decodes character references in an HTML attribute value, as the HTML tokenizer does. */
export function decodeHtmlAttribute(value: string): string {
	return decode(value, true);
}
