import type { JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RUI_CONTROL_ATTR } from '../form/control-protocol';

export type RuiTextareaProps = JsxElementProps<HTMLTextAreaElement> & {
	value?: string;
	placeholder?: string;
	disabled?: boolean;
	name?: string;
	rows?: number;
};

/**
 * Presentational wrapper around a native `<textarea>`.
 *
 * No custom element — Field owns labeling, `aria-*`, and validation wiring.
 * Marked with `data-rui-control` so `<rui-field>` can discover it.
 *
 * @remarks
 * Padding and type use the same `--space-control-*` / `--text-control` tokens as
 * `RuiInput`. Initial height comes from `rows`; invalid state keys off `aria-invalid`.
 *
 * @cssclass rui-textarea - Bordered, resizable multi-line input.
 */
export function RuiTextarea(props: RuiTextareaProps) {
	const { class: className, rows = 3, ...host } = props;

	return (
		<textarea
			{...host}
			rows={rows}
			{...{ [RUI_CONTROL_ATTR]: '' }}
			data-rui-control-type="text"
			class={cx('rui-textarea', className)}
		/>
	);
}
