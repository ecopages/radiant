import {
	formatWithMask,
	parseMaskPattern,
	readMaskInput,
	slotEnds,
	type MaskDefinitions,
	type MaskToken,
} from './input-mask';

/** A text edit of a masked input, as the `input` event reports it. */
export interface MaskEdit {
	/** The text in the input after the edit. */
	raw: string;
	/** The caret after the edit. */
	caret: number;
	/**
	 * Set when the edit was a Delete or a Backspace: the direction of the key and the value before the edit.
	 */
	deletion?: { direction: 'backward' | 'forward'; previous: string };
}

/** The masked value an edit leads to, and where its caret goes. */
export interface MaskEditResult {
	value: string;
	caret: number;
}

function caretAfterSlots(value: string, tokens: MaskToken[], count: number): number {
	const ends = slotEnds(value, tokens);
	if (count <= 0) {
		return 0;
	}
	return count >= ends.length ? value.length : ends[count - 1];
}

/**
 * Applies the mask to an edited input and maps its caret.
 *
 * @remarks
 * The caret goes after the same number of slot characters that preceded it in the edited text, so typing a digit
 * in the middle keeps the caret after it however the display shifts. When that is every slot character, it goes
 * to the end, past the literals the display ends with. A Delete or Backspace that removed only a literal
 * removes the slot character the key was aimed at instead of leaving the display as it was.
 */
export function applyMaskEdit(edit: MaskEdit, pattern: string, definitions?: MaskDefinitions): MaskEditResult {
	const tokens = parseMaskPattern(pattern, definitions);
	let input = readMaskInput(edit.raw, tokens);
	let before = readMaskInput(edit.raw.slice(0, edit.caret), tokens).length;

	if (edit.deletion && readMaskInput(edit.deletion.previous, tokens) === input) {
		if (edit.deletion.direction === 'backward' && before > 0) {
			input = `${input.slice(0, before - 1)}${input.slice(before)}`;
			before -= 1;
		} else if (edit.deletion.direction === 'forward' && before < input.length) {
			input = `${input.slice(0, before)}${input.slice(before + 1)}`;
		}
	}

	const value = formatWithMask(input, tokens);
	return { value, caret: caretAfterSlots(value, tokens, before) };
}
