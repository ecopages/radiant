import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiTooltipProps } from './tooltip.script';
import { RuiTooltip as RuiTooltipElement } from './tooltip.script';

export const RuiTooltip = defineRadiantView(
	RuiTooltipElement,
	({ children, ...props }: JsxHtmlPropsWithChildren<RuiTooltipProps & { slot?: string }>) => (
		<rui-tooltip {...props}>{children}</rui-tooltip>
	),
	{ stylesheets: ['./tooltip.css'] },
);
