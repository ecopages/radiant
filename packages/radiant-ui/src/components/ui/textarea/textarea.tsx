import type { JsxHtmlProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { attachRadiantStylesheets } from '@/lib/radiant-view';
import { RUI_CONTROL_ATTR } from '../form/control-protocol';
import type { RuiInputSize } from '../input';

export type RuiTextareaProps = JsxHtmlProps<{
	value?: string;
	placeholder?: string;
	disabled?: boolean;
	name?: string;
	rows?: number;
	size?: RuiInputSize;
	id?: string;
	'aria-label'?: string;
	'on:input'?: (event: Event) => void;
	'on:change'?: (event: Event) => void;
	'on:blur'?: (event: Event) => void;
}>;

/**
 * Presentational wrapper around a native `<textarea>`.
 *
 * No custom element — Field owns labeling, `aria-*`, and validation wiring.
 * Marked with `data-rui-control` so `<rui-field>` can discover it.
 */
export function RuiTextarea(props: RuiTextareaProps) {
	const { size = 'md', class: className, rows = 3, ...host } = props;

	return (
		<textarea
			{...host}
			rows={rows}
			{...{ [RUI_CONTROL_ATTR]: '' }}
			data-rui-control-type="text"
			class={cx('rui-textarea', `rui-textarea--${size}`, className)}
		/>
	);
}

attachRadiantStylesheets(RuiTextarea, ['./textarea.css'], import.meta.url);
