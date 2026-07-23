import type { WithChildren, RadiantSlotProps } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiSpinbuttonProps } from './spinbutton.script';
import { RuiSpinbutton as RuiSpinbuttonElement } from './spinbutton.script';
import './spinbutton.css';

export const RuiSpinbutton = defineRadiantView(
	RuiSpinbuttonElement,
	({
		slot,
		value,
		min,
		max,
		step,
		disabled,
		label,
		name,
		children,
	}: WithChildren<RuiSpinbuttonProps & RadiantSlotProps>) => (
		<rui-spinbutton
			slot={slot}
			value={value}
			min={min}
			max={max}
			step={step}
			disabled={disabled}
			label={label}
			name={name}
		>
			{children}
		</rui-spinbutton>
	),
);
