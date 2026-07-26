import type { WithChildren, RadiantSlotProps } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiTooltipProps } from './tooltip.script';
import { RuiTooltip as RuiTooltipElement } from './tooltip.script';
import './tooltip.css';

export const RuiTooltip = defineRadiantView(
	RuiTooltipElement,
	({ slot, content, placement, delay, children }: WithChildren<RuiTooltipProps & RadiantSlotProps>) => (
		<rui-tooltip slot={slot} content={content} placement={placement} delay={delay}>
			{children}
		</rui-tooltip>
	),
);
