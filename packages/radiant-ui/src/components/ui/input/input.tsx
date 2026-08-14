import type { JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { applyInputMask, maskToPlaceholder } from '@/lib/mask';
import { RUI_CONTROL_ATTR } from '../form/control-protocol';

export type RuiInputProps = JsxElementProps<HTMLInputElement> & {
	value?: string;
	type?: string;
	placeholder?: string;
	disabled?: boolean;
	name?: string;
	/**
	 * IMask pattern syntax. `0` = digit, `a` = letter, `*` = any char, `{text}` = fixed.
	 *
	 * @see https://imask.js.org/guide.html#masked-pattern
	 * @example `+{7}(000)000-00-00`
	 */
	mask?: string;
};

/**
 * Presentational wrapper around a native `<input>`.
 *
 * Pass `mask` to guide entry with an [IMask](https://imask.js.org/guide.html#masked-pattern) pattern.
 * No custom element — Field owns labeling, `aria-*`, and validation wiring.
 *
 * @remarks
 * Sets `data-rui-control` for `RuiField` discovery. Height uses `--size-control-md`
 * (shared with `RuiButton`) and `--radius-control` corners so form rows align.
 * Invalid state styles key off `aria-invalid` via the `error` role.
 *
 * @cssclass rui-input - Input root; control-height, rounded, bordered surface.
 */
export function RuiInput(props: RuiInputProps) {
	const { class: className, type = 'text', mask, placeholder, 'on:input': onInput, ...host } = props;

	const resolvedPlaceholder = mask ? maskToPlaceholder(mask) : placeholder;

	const handleInput = (event: Event) => {
		if (mask) {
			const input = event.target as HTMLInputElement;
			input.value = applyInputMask(input.value, mask);
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
			on:input={mask ? handleInput : onInput}
			inputmode={mask ? 'numeric' : undefined}
			{...{ [RUI_CONTROL_ATTR]: '' }}
			data-rui-control-type="text"
			class={cx('rui-input', className)}
		/>
	);
}
