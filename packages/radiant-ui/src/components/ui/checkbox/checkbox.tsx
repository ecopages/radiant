import type { WithChildren, RadiantSlotProps } from '@/types';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiCheckboxProps } from './checkbox.script';
import { RuiCheckbox as RuiCheckboxElement } from './checkbox.script';
import './checkbox.css';

export const RuiCheckbox = defineRadiantView(
	RuiCheckboxElement,
	({
		slot,
		checked,
		indeterminate,
		disabled,
		value,
		name,
		children,
	}: WithChildren<RuiCheckboxProps & RadiantSlotProps>) => (
		<rui-checkbox
			slot={slot}
			checked={checked}
			indeterminate={indeterminate}
			disabled={disabled}
			value={value}
			name={name}
		>
			{children}
		</rui-checkbox>
	),
);
