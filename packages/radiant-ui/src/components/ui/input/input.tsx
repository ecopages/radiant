import type { JsxHtmlProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { applyInputMask, maskToPlaceholder } from '@/lib/mask';
import { attachRadiantStylesheets } from '@/lib/radiant-view';
import { RUI_CONTROL_ATTR } from '../form/control-protocol';

export type RuiInputProps = JsxHtmlProps<{
	value?: string;
	type?: string;
	placeholder?: string;
	disabled?: boolean;
	name?: string;
	id?: string;
	'aria-label'?: string;
	/**
	 * IMask pattern syntax. `0` = digit, `a` = letter, `*` = any char, `{text}` = fixed.
	 *
	 * @see https://imask.js.org/guide.html#masked-pattern
	 * @example `+{7}(000)000-00-00`
	 */
	mask?: string;
	'on:input'?: (event: Event) => void;
	'on:change'?: (event: Event) => void;
	'on:blur'?: (event: Event) => void;
}>;

/**
 * Presentational wrapper around a native `<input>`.
 *
 * Pass `mask` to guide entry with an [IMask](https://imask.js.org/guide.html#masked-pattern) pattern.
 * No custom element — Field owns labeling, `aria-*`, and validation wiring.
 */
export function RuiInput(props: RuiInputProps) {
	const { class: className, type = 'text', mask, placeholder, 'on:input': onInput, ...host } = props;

	const resolvedPlaceholder = mask ? maskToPlaceholder(mask) : placeholder;

	const handleInput = (event: Event) => {
		if (mask) {
			const input = event.target as HTMLInputElement;
			input.value = applyInputMask(input.value, mask);
		}
		onInput?.(event);
	};

	return (
		<input
			{...host}
			type={type}
			placeholder={resolvedPlaceholder}
			{...(mask ? { 'on:input': handleInput } : onInput ? { 'on:input': onInput } : {})}
			inputmode={mask ? 'numeric' : undefined}
			{...{ [RUI_CONTROL_ATTR]: '' }}
			data-rui-control-type="text"
			class={cx('rui-input', className)}
		/>
	);
}

attachRadiantStylesheets(RuiInput, ['./input.css'], import.meta.url);
