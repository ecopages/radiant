import type { JsxHtmlProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { attachRadiantStylesheets } from '@/lib/radiant-view';
import { RUI_CONTROL_ATTR } from '../form/control-protocol';

export type RuiInputSize = 'sm' | 'md' | 'lg';

export type RuiInputProps = JsxHtmlProps<{
	value?: string;
	type?: string;
	placeholder?: string;
	disabled?: boolean;
	name?: string;
	size?: RuiInputSize;
	id?: string;
	'aria-label'?: string;
	'on:input'?: (event: Event) => void;
	'on:change'?: (event: Event) => void;
	'on:blur'?: (event: Event) => void;
}>;

/**
 * Presentational wrapper around a native `<input>`.
 *
 * No custom element — Field owns labeling, `aria-*`, and validation wiring.
 * Marked with `data-rui-control` so `<rui-field>` can discover it.
 */
export function RuiInput(props: RuiInputProps) {
	const { size = 'md', class: className, type = 'text', ...host } = props;

	return (
		<input
			{...host}
			type={type}
			{...{ [RUI_CONTROL_ATTR]: '' }}
			data-rui-control-type="text"
			class={cx('rui-input', `rui-input--${size}`, className)}
		/>
	);
}

attachRadiantStylesheets(RuiInput, ['./input.css'], import.meta.url);
