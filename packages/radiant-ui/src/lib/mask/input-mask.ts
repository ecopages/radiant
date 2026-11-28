/**
 * Pattern mask utilities, with a pattern syntax modelled on
 * [IMask](https://imask.js.org/guide.html#masked-pattern).
 *
 * Default slot definitions:
 * - `0` — digit
 * - `a` — letter
 * - `*` — any character
 *
 * Other syntax:
 * - `{text}` — fixed text that is part of the unmasked value (see {@link extractUnmaskedValue}); every
 *   character between the braces is text, so `{380}` holds no slot
 * - `[…]` — optional section
 * - `\` — escape the next character (e.g. `\0` for a literal zero)
 * - all other characters — fixed literals (`+`, `(`, `-`, …)
 *
 * @remarks
 * IMask reads a slot character inside braces as a slot, treats `[` `]` as a toggle and a backtick as a stop
 * character; this syntax does not. A pattern inside the common grammar (slots, `\x`, `{text}` of literal
 * characters, non-nested `[…]` and no backtick) means the same in both.
 */

export type MaskInputKind = 'digit' | 'letter' | 'any';

/**
 * One element of a parsed mask: an input slot, a fixed text or a literal. `optional` is set on every token inside
 * an optional section, so a literal there is shown only once the section is entered.
 */
export type MaskToken =
	| { type: 'literal'; value: string; optional?: boolean }
	| { type: 'fixed'; value: string; optional?: boolean }
	| { type: 'input'; definition: string; kind: MaskInputKind; pattern?: RegExp; optional?: boolean };

/**
 * Custom slot characters, mapped to an input kind or a regular expression.
 */
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

function textToken(type: 'literal' | 'fixed', value: string, optional: boolean): MaskToken {
	return optional ? { type, value, optional } : { type, value };
}

function parseMaskPatternInternal(pattern: string, definitions?: MaskDefinitions, optional = false): MaskToken[] {
	const tokens: MaskToken[] = [];
	let index = 0;

	while (index < pattern.length) {
		const char = pattern[index];

		if (char === '\\') {
			const next = pattern[index + 1];
			if (next) {
				tokens.push(textToken('literal', next, optional));
			}
			index += 2;
			continue;
		}

		if (char === '{') {
			const end = pattern.indexOf('}', index + 1);
			if (end < 0) {
				tokens.push(textToken('literal', '{', optional));
				index += 1;
				continue;
			}
			tokens.push(textToken('fixed', pattern.slice(index + 1, end), optional));
			index = end + 1;
			continue;
		}

		if (char === '[') {
			const end = findClosingBracket(pattern, index + 1);
			if (end < 0) {
				tokens.push(textToken('literal', '[', optional));
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

		tokens.push(textToken('literal', char, optional));
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

/** Parses a pattern string into tokens. */
export function parseMaskPattern(pattern: string, definitions?: MaskDefinitions): MaskToken[] {
	return parseMaskPatternInternal(pattern, definitions);
}

/**
 * How many characters a mask takes; `requiredOnly` leaves out optional sections.
 */
export function maskInputSlotCount(tokens: MaskToken[], options: { requiredOnly?: boolean } = {}): number {
	return tokens.filter((token) => token.type === 'input' && (!options.requiredOnly || !token.optional)).length;
}

/**
 * Placeholder with `_` for each input slot.
 *
 * @example
 * ```ts
 * maskToPlaceholder('(000) 000-0000'); // '(___) ___-____'
 * ```
 */
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

/**
 * Walks a masked display value against its tokens and reports what each token took from it.
 *
 * @remarks
 * A literal or fixed text is taken when it stands at the cursor; a slot takes the character at the cursor only
 * when it fits. A token that takes nothing is skipped without moving the cursor.
 */
function walkMasked(
	masked: string,
	tokens: MaskToken[],
	visit: (token: MaskToken, taken: string, end: number) => void,
): void {
	let cursor = 0;

	for (const token of tokens) {
		if (token.type === 'fixed' || token.type === 'literal') {
			if (masked.startsWith(token.value, cursor)) {
				cursor += token.value.length;
				visit(token, token.value, cursor);
			}
			continue;
		}

		if (cursor >= masked.length) {
			continue;
		}

		const char = masked[cursor];
		if (matchesInput(char, token.kind, token.pattern)) {
			cursor += 1;
			visit(token, char, cursor);
		}
	}
}

/**
 * Extracts the characters the user typed into the slots of a masked value. Fixed text, `{text}` included, is not
 * part of the result.
 *
 * @remarks
 * Slots only, because {@link formatWithMask} and {@link applyInputMask} work on that. For the value IMask calls
 * unmasked, which holds the `{text}` too, use {@link extractUnmaskedValue}.
 *
 * @example
 * ```ts
 * extractMaskInput('+12 345', parseMaskPattern('+00 000')); // '12345'
 * extractMaskInput('+7 123', parseMaskPattern('+{7} 000')); // '123'
 * ```
 */
export function extractMaskInput(masked: string, tokens: MaskToken[]): string {
	let input = '';
	walkMasked(masked, tokens, (token, taken) => {
		if (token.type === 'input') {
			input += taken;
		}
	});
	return input;
}

/**
 * Extracts the unmasked value of a masked display value: the slot characters and the `{text}` fixed text, in
 * order, as IMask's `unmaskedValue` reads it. {@link formatUnmaskedValue} is its inverse.
 *
 * @example
 * ```ts
 * extractUnmaskedValue('+7 123', parseMaskPattern('+{7} 000')); // '7123'
 * ```
 */
export function extractUnmaskedValue(masked: string, tokens: MaskToken[]): string {
	let unmasked = '';
	walkMasked(masked, tokens, (token, taken) => {
		if (token.type !== 'literal') {
			unmasked += taken;
		}
	});
	return unmasked;
}

function nextInputAccepts(tokens: MaskToken[], from: number, input: string, inputIndex: number): boolean {
	const next = tokens.slice(from).find((token) => token.type === 'input');
	return (
		next?.type === 'input' && inputIndex < input.length && matchesInput(input[inputIndex], next.kind, next.pattern)
	);
}

function formatTokens(input: string, tokens: MaskToken[], fixedInInput: boolean): string {
	if (!input) {
		return '';
	}

	let inputIndex = 0;
	let result = '';

	for (const [index, token] of tokens.entries()) {
		if (token.type === 'fixed' || token.type === 'literal') {
			if (token.optional && !nextInputAccepts(tokens, index + 1, input, inputIndex)) {
				continue;
			}
			result += token.value;
			if (fixedInInput && token.type === 'fixed' && input.startsWith(token.value, inputIndex)) {
				inputIndex += token.value.length;
			}
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

/**
 * Formats extracted input characters into a masked display string.
 *
 * Returns `''` when `input` is empty. Fixed text is always shown and is not read from `input`.
 *
 * @example
 * ```ts
 * formatWithMask('12345', parseMaskPattern('+00 000')); // '+12 345'
 * ```
 */
export function formatWithMask(input: string, tokens: MaskToken[]): string {
	return formatTokens(input, tokens, false);
}

/**
 * Formats an unmasked value, the kind {@link extractUnmaskedValue} returns, into a masked display string.
 *
 * Returns `''` when `unmasked` is empty. A `{text}` that stands where the pattern puts it is consumed from the
 * value; one that does not is shown all the same.
 *
 * @example
 * ```ts
 * formatUnmaskedValue('7123', parseMaskPattern('+{7} 000')); // '+7 123'
 * ```
 */
export function formatUnmaskedValue(unmasked: string, tokens: MaskToken[]): string {
	return formatTokens(unmasked, tokens, true);
}

/**
 * Reads the slot characters out of raw text the user typed, pasted or edited, which is not yet a masked value.
 *
 * @remarks
 * Unlike {@link extractMaskInput}, which reads a well-formed display value, it keeps the characters that fit the
 * slots in order and skips every other one, so a character inserted in the middle of a display value shifts the
 * rest instead of ending the read. Fixed text and literals are consumed where they stand, so the `{7}` of a
 * pattern is not read again from `+7(912)`. Characters beyond the last slot are dropped. Not exported from the
 * package: callers use {@link applyInputMask}.
 */
export function readMaskInput(raw: string, tokens: MaskToken[]): string {
	let input = '';
	let cursor = 0;

	for (const token of tokens) {
		if (token.type === 'fixed' || token.type === 'literal') {
			if (raw.startsWith(token.value, cursor)) {
				cursor += token.value.length;
			}
			continue;
		}

		while (cursor < raw.length && !matchesInput(raw[cursor], token.kind, token.pattern)) {
			cursor += 1;
		}
		if (cursor >= raw.length) {
			break;
		}
		input += raw[cursor];
		cursor += 1;
	}

	return input;
}

/**
 * The index in a masked display value right after each of its slot characters. Not exported from the package.
 */
export function slotEnds(masked: string, tokens: MaskToken[]): number[] {
	const ends: number[] = [];
	walkMasked(masked, tokens, (token, _taken, end) => {
		if (token.type === 'input') {
			ends.push(end);
		}
	});
	return ends;
}

/**
 * Normalizes user input to a masked display value.
 *
 * @remarks
 * Reads the text with {@link readMaskInput}: no character that fits is lost, and none that does not fit is kept.
 *
 * @example
 * ```ts
 * applyInputMask('5551234567', '(000) 000-0000'); // '(555) 123-4567'
 * applyInputMask('(5595) 123-4567', '(000) 000-0000'); // '(559) 512-3456'
 * ```
 */
export function applyInputMask(raw: string, pattern: string, definitions?: MaskDefinitions): string {
	const tokens = parseMaskPattern(pattern, definitions);
	return formatWithMask(readMaskInput(raw, tokens), tokens);
}
