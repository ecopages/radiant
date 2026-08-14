import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiTooltip as RuiTooltipElement, RuiTooltipProps } from './tooltip.script';
import './tooltip.script';

export function RuiTooltip({ children, ...props }: JsxCustomElementAttributes<RuiTooltipElement, RuiTooltipProps>) {
	return <rui-tooltip {...props}>{children}</rui-tooltip>;
}
