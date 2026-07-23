import type { WithChildren, RadiantSlotProps } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiToolbarProps } from './toolbar.script';
import { RuiToolbar as RuiToolbarElement } from './toolbar.script';
import './toolbar.css';

export const RuiToolbar = defineRadiantView(
	RuiToolbarElement,
	({ slot, label, exclusiveToggles, children }: WithChildren<RuiToolbarProps & RadiantSlotProps>) => (
		<rui-toolbar slot={slot} label={label} exclusiveToggles={exclusiveToggles}>
			{children}
		</rui-toolbar>
	),
);
