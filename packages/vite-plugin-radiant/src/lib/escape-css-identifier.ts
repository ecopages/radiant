export function escapeCssIdentifier(value: string): string {
	const escape = globalThis.CSS?.escape;
	if (typeof escape === 'function') return escape(value);
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
		(codePoint > 0 && codePoint < 0x0020) ||
		codePoint === 0x007f ||
		(codePoint >= 0x0030 && codePoint <= 0x0039 && (index === 0 || (index === 1 && value[0] === '-')))
	);
}

function isCssIdentifierCharacter(character: string, codePoint: number): boolean {
	return codePoint >= 0x0080 || /[-_0-9A-Za-z]/.test(character);
}
