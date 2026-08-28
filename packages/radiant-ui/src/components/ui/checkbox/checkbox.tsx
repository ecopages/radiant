import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import {
	CHECKBOX_DEFAULT_VALUE,
	type RuiCheckbox as RuiCheckboxElement,
	type RuiCheckboxProps,
} from './checkbox.script';
import './checkbox.script';

/**
 * Checkbox view. Stamps `[data-ref="input"]` on a native checkbox inside a label row.
 *
 * @cssclass rui-checkbox - Label row: box + visible label.
 * @cssclass rui-checkbox__input - Native input (visually hidden, receives focus).
 * @cssclass rui-checkbox__control - Visible box with check / indeterminate glyph.
 * @cssclass rui-checkbox__label - Light-DOM label text.
 *
 * @remarks Children render in `rui-checkbox__label`. The input always carries
 * `data-rui-control` and `data-rui-control-type="boolean"`.
 */
export function RuiCheckbox({
	children,
	checked,
	disabled,
	indeterminate,
	name,
	value = CHECKBOX_DEFAULT_VALUE,
	...props
}: JsxCustomElementAttributes<RuiCheckboxElement, RuiCheckboxProps>) {
	return (
		<rui-checkbox
			{...props}
			checked={checked}
			disabled={disabled}
			indeterminate={indeterminate}
			name={name}
			value={value}
			data-disabled={disabled ? '' : undefined}
		>
			<label class="rui-checkbox">
				<input
					type="checkbox"
					data-ref="input"
					data-rui-control
					data-rui-control-type="boolean"
					class="rui-checkbox__input"
					checked={checked}
					disabled={disabled}
					value={value}
					name={name || undefined}
					aria-checked={indeterminate ? 'mixed' : undefined}
				/>
				<span class="rui-checkbox__control" aria-hidden="true"></span>
				<span class="rui-checkbox__label">{children}</span>
			</label>
		</rui-checkbox>
	);
}
