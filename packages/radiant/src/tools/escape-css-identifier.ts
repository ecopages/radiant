export function escapeCssIdentifier(value: string): string {
	const cssNamespace = globalThis.CSS as { escape?: (value: string) => string } | undefined;
	if (typeof cssNamespace?.escape === 'function') return cssNamespace.escape(value);
	let escaped = '';
	for (let index = 0; index < value.length; index += 1) escaped += escapeCharacter(value, index);
	return escaped;
}

function escapeCharacter(value: string, index: number): string {
	const character = value[index] ?? '';
	const codePoint = character.codePointAt(0) ?? 0;
	if (codePoint === 0) return '\uFFFD';
	if (requiresCodePointEscape(value, index, codePoint)) return `\\${codePoint.toString(16)} `;
	if (isCssIdentifierCharacter(character, codePoint))
		return index === 0 && character === '-' && value.length === 1 ? `\\${character}` : character;
	return `\\${character}`;
}

function requiresCodePointEscape(value: string, index: number, codePoint: number): boolean {
	return (
		(codePoint >= 0x0001 && codePoint <= 0x001f) ||
		codePoint === 0x007f ||
		(index === 0 && codePoint >= 0x0030 && codePoint <= 0x0039) ||
		(index === 1 && codePoint >= 0x0030 && codePoint <= 0x0039 && (value[0] ?? '') === '-')
	);
}

function isCssIdentifierCharacter(character: string, codePoint: number): boolean {
	return (
		codePoint >= 0x0080 ||
		character === '-' ||
		character === '_' ||
		(codePoint >= 0x0030 && codePoint <= 0x0039) ||
		(codePoint >= 0x0041 && codePoint <= 0x005a) ||
		(codePoint >= 0x0061 && codePoint <= 0x007a)
	);
}
