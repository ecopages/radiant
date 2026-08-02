/**
 * IMask-compatible pattern mask utilities.
 *
 * @see https://imask.js.org/guide.html#masked-pattern
 *
 * Default slot definitions:
 * - `0` — digit
 * - `a` — letter
 * - `*` — any character
 *
 * Other syntax:
 * - `{text}` — fixed value (included in extracted input)
 * - `[…]` — optional section
 * - `\` — escape the next character (e.g. `\0` for a literal zero)
 * - all other characters — fixed literals (`+`, `(`, `-`, …)
 */

export type MaskInputKind = 'digit' | 'letter' | 'any';

export type MaskToken =
	| { type: 'literal'; value: string }
	| { type: 'fixed'; value: string }
	| { type: 'input'; definition: string; kind: MaskInputKind; pattern?: RegExp; optional?: boolean };

export type MaskDefinitions = Record<string, MaskInputKind | RegExp>;

const DEFAULT_DEFINITIONS: Record<string, MaskInputKind> = {
	'0': 'digit',
	a: 'letter',
	'*': 'any',
};

const LETTER = /\p{L}/u;

function resolveDefinition(
	char: string,
	definitions?: MaskDefinitions,
): { kind: MaskInputKind; pattern?: RegExp } | null {
	const custom = definitions?.[char];
	if (custom instanceof RegExp) {
		return { kind: 'any', pattern: custom };
	}
	if (custom) {
		return { kind: custom };
	}
	const builtIn = DEFAULT_DEFINITIONS[char];
	return builtIn ? { kind: builtIn } : null;
}

function matchesInput(char: string, kind: MaskInputKind, pattern?: RegExp): boolean {
	if (pattern) {
		return pattern.test(char);
	}
	if (kind === 'digit') {
		return /\d/.test(char);
	}
	if (kind === 'letter') {
		return LETTER.test(char);
	}
	return char.length > 0;
}

function parseMaskPatternInternal(pattern: string, definitions?: MaskDefinitions, optional = false): MaskToken[] {
	const tokens: MaskToken[] = [];
	let index = 0;

	while (index < pattern.length) {
		const char = pattern[index];

		if (char === '\\') {
			const next = pattern[index + 1];
			if (next) {
				tokens.push({ type: 'literal', value: next });
			}
			index += 2;
			continue;
		}

		if (char === '{') {
			const end = pattern.indexOf('}', index + 1);
			if (end < 0) {
				tokens.push({ type: 'literal', value: '{' });
				index += 1;
				continue;
			}
			tokens.push({ type: 'fixed', value: pattern.slice(index + 1, end) });
			index = end + 1;
			continue;
		}

		if (char === '[') {
			const end = findClosingBracket(pattern, index + 1);
			if (end < 0) {
				tokens.push({ type: 'literal', value: '[' });
				index += 1;
				continue;
			}
			const inner = parseMaskPatternInternal(pattern.slice(index + 1, end), definitions, true);
			tokens.push(...inner);
			index = end + 1;
			continue;
		}

		if (char === ']') {
			break;
		}

		const definition = resolveDefinition(char, definitions);
		if (definition) {
			tokens.push({
				type: 'input',
				definition: char,
				kind: definition.kind,
				pattern: definition.pattern,
				optional,
			});
			index += 1;
			continue;
		}

		tokens.push({ type: 'literal', value: char });
		index += 1;
	}

	return tokens;
}

function findClosingBracket(pattern: string, start: number): number {
	let depth = 1;
	for (let index = start; index < pattern.length; index += 1) {
		if (pattern[index] === '[' && pattern[index - 1] !== '\\') {
			depth += 1;
		}
		if (pattern[index] === ']' && pattern[index - 1] !== '\\') {
			depth -= 1;
			if (depth === 0) {
				return index;
			}
		}
	}
	return -1;
}

/** Parses an IMask pattern string into tokens. */
export function parseMaskPattern(pattern: string, definitions?: MaskDefinitions): MaskToken[] {
	return parseMaskPatternInternal(pattern, definitions);
}

export function maskInputSlotCount(tokens: MaskToken[], options: { requiredOnly?: boolean } = {}): number {
	return tokens.filter((token) => token.type === 'input' && (!options.requiredOnly || !token.optional)).length;
}

/** @deprecated Use `maskInputSlotCount`. */
export function maskDigitSlotCount(tokens: MaskToken[]): number {
	return maskInputSlotCount(tokens, { requiredOnly: true });
}

/** Placeholder using IMask's default `_` for input slots. */
export function maskToPlaceholder(pattern: string, definitions?: MaskDefinitions): string {
	const tokens = parseMaskPattern(pattern, definitions);
	let result = '';

	for (const token of tokens) {
		if (token.type === 'literal' || token.type === 'fixed') {
			result += token.value;
			continue;
		}
		result += '_';
	}

	return result;
}

/** Extracts user-typed characters from a masked value (skips fixed segments and literals). */
export function extractMaskInput(masked: string, tokens: MaskToken[]): string {
	let input = '';
	let cursor = 0;

	for (const token of tokens) {
		if (token.type === 'fixed' || token.type === 'literal') {
			if (masked.slice(cursor, cursor + token.value.length) === token.value) {
				cursor += token.value.length;
			}
			continue;
		}

		if (cursor >= masked.length) {
			continue;
		}

		const char = masked[cursor];
		if (matchesInput(char, token.kind, token.pattern)) {
			input += char;
			cursor += 1;
		}
	}

	return input;
}

/** @deprecated Use `extractMaskInput`. */
export function extractMaskDigits(masked: string, tokens: MaskToken[]): string {
	return extractMaskInput(masked, tokens).replace(/\D/g, '');
}

/**
 * Formats extracted input characters into a masked display string.
 *
 * Returns `''` when `input` is empty.
 */
export function formatWithMask(input: string, tokens: MaskToken[]): string {
	if (!input) {
		return '';
	}

	let inputIndex = 0;
	let result = '';

	for (const token of tokens) {
		if (token.type === 'fixed' || token.type === 'literal') {
			result += token.value;
			continue;
		}

		if (inputIndex >= input.length) {
			if (token.optional) {
				continue;
			}
			break;
		}

		const char = input[inputIndex];
		if (!matchesInput(char, token.kind, token.pattern)) {
			if (token.optional) {
				continue;
			}
			break;
		}

		result += char;
		inputIndex += 1;
	}

	return result;
}

function isDigitOnlyPattern(tokens: MaskToken[]): boolean {
	return tokens.every((token) => token.type !== 'input' || token.kind === 'digit');
}

function looseInputFromRaw(raw: string, tokens: MaskToken[]): string {
	const loose = raw.replace(/\D/g, '');
	const fixedDigits = tokens
		.filter((token) => token.type === 'fixed')
		.map((token) => token.value.replace(/\D/g, ''))
		.join('');

	if (fixedDigits && loose.startsWith(fixedDigits)) {
		return loose.slice(fixedDigits.length);
	}

	return loose;
}

/** Normalizes user input to a masked display value. */
export function applyInputMask(raw: string, pattern: string, definitions?: MaskDefinitions): string {
	const tokens = parseMaskPattern(pattern, definitions);
	const capacity = maskInputSlotCount(tokens);
	let input = extractMaskInput(raw, tokens);

	if (input.length === 0 && /\S/.test(raw) && isDigitOnlyPattern(tokens)) {
		input = looseInputFromRaw(raw, tokens);
	}

	if (input.length > capacity) {
		input = input.slice(0, capacity);
	}

	return formatWithMask(input, tokens);
}
