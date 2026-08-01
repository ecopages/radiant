import { attachRadiantStylesheets } from '@/lib/radiant-view';
import { RUI_CONTROL_ATTR } from '../form/control-protocol';

export type RuiInputSize = 'sm' | 'md' | 'lg';

export type RuiInputProps = {
	value?: string;
	type?: string;
	placeholder?: string;
	disabled?: boolean;
	name?: string;
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
 * Presentational wrapper around a native `<input>`.
 *
 * No custom element — Field owns labeling, `aria-*`, and validation wiring.
 * Marked with `data-rui-control` so `<rui-field>` can discover it.
 */
export function RuiInput({
	value,
	type = 'text',
	placeholder,
	disabled,
	name,
	size = 'md',
	class: className,
	id,
	'aria-label': ariaLabel,
	'on:input': onInput,
	'on:change': onChange,
	'on:blur': onBlur,
	...rest
}: RuiInputProps) {
	return (
		<input
			id={id}
			type={type}
			{...{ [RUI_CONTROL_ATTR]: '' }}
			data-rui-control-type="text"
			class={cx('rui-input', `rui-input--${size}`, className)}
			value={value}
			placeholder={placeholder}
			disabled={disabled}
			name={name}
			aria-label={ariaLabel}
			on:input={onInput}
			on:change={onChange}
			on:blur={onBlur}
			{...rest}
		/>
	);
}

attachRadiantStylesheets(RuiInput, ['./input.css'], import.meta.url);
