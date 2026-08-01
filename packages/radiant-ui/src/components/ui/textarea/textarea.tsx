import { attachRadiantStylesheets } from '@/lib/radiant-view';
import { RUI_CONTROL_ATTR } from '../form/control-protocol';
import type { RuiInputSize } from '../input';

export type RuiTextareaProps = {
	value?: string;
	placeholder?: string;
	disabled?: boolean;
	name?: string;
	rows?: number;
	size?: RuiInputSize;
	class?: string;
	id?: string;
	'aria-label'?: string;
	'on:input'?: (event: Event) => void;
	'on:change'?: (event: Event) => void;
	'on:blur'?: (event: Event) => void;
};

function cx(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(' ');
}

/**
 * Presentational wrapper around a native `<textarea>`.
 *
 * No custom element — Field owns labeling, `aria-*`, and validation wiring.
 * Marked with `data-rui-control` so `<rui-field>` can discover it.
 */
export function RuiTextarea({
	value,
	placeholder,
	disabled,
	name,
	rows = 3,
	size = 'md',
	class: className,
	id,
	'aria-label': ariaLabel,
	'on:input': onInput,
	'on:change': onChange,
	'on:blur': onBlur,
	...rest
}: RuiTextareaProps) {
	return (
		<textarea
			id={id}
			{...{ [RUI_CONTROL_ATTR]: '' }}
			data-rui-control-type="text"
			class={cx('rui-textarea', `rui-textarea--${size}`, className)}
			value={value}
			placeholder={placeholder}
			disabled={disabled}
			rows={rows}
			name={name}
			aria-label={ariaLabel}
			on:input={onInput}
			on:change={onChange}
			on:blur={onBlur}
			{...rest}
		/>
	);
}

attachRadiantStylesheets(RuiTextarea, ['./textarea.css'], import.meta.url);
