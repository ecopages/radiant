import type { JsxCustomElementAttributes, JsxElementProps, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RuiCheckbox } from '../checkbox';
import { parseMultiValue, serializeViewValue } from '../shared/multi-value';
import type {
	RuiCheckboxGroup as RuiCheckboxGroupElement,
	RuiCheckboxGroupOrientation,
	RuiCheckboxGroupProps,
} from './checkbox-group.script';
import './checkbox-group.script';

export type RuiCheckboxOption = {
	value: string;
	label: JsxRenderable;
	disabled?: boolean;
};

export type RuiCheckboxGroupControlProps = JsxElementProps<HTMLDivElement> & {
	orientation?: RuiCheckboxGroupOrientation;
};

/** Accessible surface that contains checkbox options. */
export function RuiCheckboxGroupControl({
	children,
	class: className,
	orientation = 'vertical',
	...props
}: RuiCheckboxGroupControlProps) {
	return (
		<div
			{...props}
			data-checkbox-group-root
			data-orientation={orientation}
			class={cx('rui-checkbox-group', className)}
			role="group"
			data-rui-control
			data-rui-control-type="text"
		>
			{children}
		</div>
	);
}

/**
 * Checkbox group with an `options` convenience API; renders one `RuiCheckbox`
 * per option inside `<rui-checkbox-group>`.
 */
export function RuiCheckboxGroup({
	options,
	children,
	value,
	orientation = 'vertical',
	...props
}: JsxCustomElementAttributes<
	RuiCheckboxGroupElement,
	RuiCheckboxGroupProps & { options?: RuiCheckboxOption[]; value?: string | string[] }
>) {
	const serializedValue = serializeViewValue(value);
	const selected = new Set(parseMultiValue(serializedValue ?? ''));

	return (
		<rui-checkbox-group {...props} value={serializedValue} orientation={orientation}>
			{options == null ? (
				children
			) : (
				<RuiCheckboxGroupControl orientation={orientation}>
					{options.map((option) => (
						<RuiCheckbox
							value={option.value}
							disabled={option.disabled}
							checked={selected.has(option.value)}
						>
							{option.label}
						</RuiCheckbox>
					))}
				</RuiCheckboxGroupControl>
			)}
		</rui-checkbox-group>
	);
}
