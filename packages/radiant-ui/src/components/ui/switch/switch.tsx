import type { WithChildren, RadiantSlotProps } from '@/types';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiSwitchProps } from './switch.script';
import { RuiSwitch as RuiSwitchElement } from './switch.script';
import './switch.css';

export const RuiSwitch = defineRadiantView(
	RuiSwitchElement,
	({ slot, checked, disabled, name, children }: WithChildren<RuiSwitchProps & RadiantSlotProps>) => (
		<rui-switch slot={slot} checked={checked} disabled={disabled} name={name}>
			{children}
		</rui-switch>
	),
);
