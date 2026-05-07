export function escapeCssIdentifier(value: string): string {
	const cssNamespace = globalThis.CSS as { escape?: (value: string) => string } | undefined;

	if (typeof cssNamespace?.escape === 'function') {
		return cssNamespace.escape(value);
	}

	let escaped = '';

	for (let index = 0; index < value.length; index += 1) {
		const character = value[index] ?? '';
		const codePoint = character.codePointAt(0) ?? 0;

		if (codePoint === 0) {
			escaped += '\uFFFD';
			continue;
		}

		const isControlCharacter = (codePoint >= 0x0001 && codePoint <= 0x001f) || codePoint === 0x007f;
		const startsWithDigit = index === 0 && codePoint >= 0x0030 && codePoint <= 0x0039;
		const startsWithHyphenDigit =
			index === 1 && codePoint >= 0x0030 && codePoint <= 0x0039 && (value[0] ?? '') === '-';
		const isSingleHyphen = index === 0 && character === '-' && value.length === 1;

		if (isControlCharacter || startsWithDigit || startsWithHyphenDigit) {
			escaped += `\\${codePoint.toString(16)} `;
			continue;
		}

		if (
			codePoint >= 0x0080 ||
			character === '-' ||
			character === '_' ||
			(codePoint >= 0x0030 && codePoint <= 0x0039) ||
			(codePoint >= 0x0041 && codePoint <= 0x005a) ||
			(codePoint >= 0x0061 && codePoint <= 0x007a)
		) {
			escaped += isSingleHyphen ? `\\${character}` : character;
			continue;
		}

		escaped += `\\${character}`;
	}

	return escaped;
}
