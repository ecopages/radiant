import type { WithChildren, RadiantSlotProps } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiAlertProps } from './alert.script';
import { RuiAlert as RuiAlertElement } from './alert.script';
import './alert.css';

export const RuiAlert = defineRadiantView(
	RuiAlertElement,
	({ slot, variant, children }: WithChildren<RuiAlertProps & RadiantSlotProps>) => (
		<rui-alert slot={slot} variant={variant}>
			{children}
		</rui-alert>
	),
);
