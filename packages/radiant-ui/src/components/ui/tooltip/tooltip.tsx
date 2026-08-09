import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import type { RuiTooltipProps } from './tooltip.script';
import './tooltip.script';

export function RuiTooltip({ children, ...props }: JsxHtmlPropsWithChildren<RuiTooltipProps & { slot?: string }>) {
	return <rui-tooltip {...props}>{children}</rui-tooltip>;
}
