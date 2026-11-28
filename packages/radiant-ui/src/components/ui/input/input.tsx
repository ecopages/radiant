import { cx } from '@/lib/cx';
import { maskToPlaceholder, parseMaskPattern, type MaskDefinitions } from '@/lib/mask';
import { applyMaskEdit } from '@/lib/mask/mask-edit';
import type { NativeInputProps } from '@/lib/native-element-props';
import { RUI_CONTROL_ATTR } from '@/lib/form/control-protocol';

export type RuiInputProps = NativeInputProps & {
	value?: string;
	type?: string;
	placeholder?: string;
	disabled?: boolean;
	name?: string;
	/**
	 * Pattern mask. `0` = digit, `a` = letter, `*` = any char, `{text}` = fixed text, `[...]` = optional section,
	 * `\` escapes the next character. See `parseMaskPattern`.
	 *
	 * @example `+{7}(000)000-00-00`
	 */
	mask?: string;
	/** Extra slot characters for `mask`, each mapped to a kind or a regular expression. */
	definitions?: MaskDefinitions;
};

/**
 * Presentational wrapper around a native `<input>`.
 *
 * Pass `mask` to format entry as a pattern. The text the user types, pastes or edits is read with the mask,
 * so no character that fits a slot is lost and the caret stays after the character just typed.
 * No custom element — Field owns labeling, `aria-*`, and validation wiring.
 * Native `<input>` attributes (`required`, `autocomplete`, `pattern`, …) are part of the props type.
 *
 * @remarks
 * Sets `data-rui-control` for `RuiField` discovery. Height uses `--size-control-md`
 * (shared with `RuiButton`) and `--radius-control` corners so form rows align.
 * Invalid state styles key off `aria-invalid` via the `error` role. An authored `placeholder` and an authored
 * `inputmode` win over the ones the mask would give; without `inputmode`, a mask whose slots are all digits
 * sets `numeric`.
 *
 * @cssclass rui-input - Input root; control-height, rounded, bordered surface.
 */
export function RuiInput(props: RuiInputProps) {
	const {
		class: className,
		type = 'text',
		mask,
		definitions,
		placeholder,
		inputmode,
		'on:input': onInput,
		'on:beforeinput': onBeforeInput,
		...host
	} = props;

	const tokens = mask ? parseMaskPattern(mask, definitions) : undefined;
	const resolvedPlaceholder = placeholder ?? (mask ? maskToPlaceholder(mask, definitions) : undefined);
	const digitsOnly = tokens?.every((token) => token.type !== 'input' || token.kind === 'digit') ?? false;
	const resolvedInputmode = inputmode ?? (digitsOnly ? 'numeric' : undefined);

	let previous: string | undefined;

	const handleBeforeInput = (event: Event) => {
		previous = (event.target as HTMLInputElement).value;
		if (typeof onBeforeInput === 'function') {
			(onBeforeInput as (event: Event) => void)(event);
		} else if (onBeforeInput != null && typeof onBeforeInput === 'object' && 'handleEvent' in onBeforeInput) {
			(onBeforeInput as { handleEvent(event: Event): void }).handleEvent(event);
		}
	};

	const handleInput = (event: Event) => {
		const input = event.target as HTMLInputElement;
		const inputType = (event as InputEvent).inputType;
		const direction =
			inputType === 'deleteContentBackward'
				? 'backward'
				: inputType === 'deleteContentForward'
					? 'forward'
					: undefined;
		const { value, caret } = applyMaskEdit(
			{
				raw: input.value,
				caret: input.selectionStart ?? input.value.length,
				deletion: direction && previous !== undefined ? { direction, previous } : undefined,
			},
			mask as string,
			definitions,
		);
		previous = undefined;
		if (input.value !== value) {
			input.value = value;
		}
		if (input.selectionStart !== null && input.selectionStart !== caret) {
			input.setSelectionRange(caret, caret);
		}
		if (typeof onInput === 'function') {
			(onInput as (event: Event) => void)(event);
		} else if (onInput != null && typeof onInput === 'object' && 'handleEvent' in onInput) {
			(onInput as { handleEvent(event: Event): void }).handleEvent(event);
		}
	};

	return (
		<input
			{...host}
			type={type}
			placeholder={resolvedPlaceholder}
			on:beforeinput={mask ? handleBeforeInput : onBeforeInput}
			on:input={mask ? handleInput : onInput}
			inputmode={resolvedInputmode}
			{...{ [RUI_CONTROL_ATTR]: '' }}
			data-rui-control-type="text"
			class={cx('rui-input', className)}
		/>
	);
}
