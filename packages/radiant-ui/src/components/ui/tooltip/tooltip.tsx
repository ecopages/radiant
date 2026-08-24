import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiTooltip as RuiTooltipElement, RuiTooltipProps } from './tooltip.script';
import './tooltip.script';

export function RuiTooltip({
	children,
	content = '',
	...props
}: JsxCustomElementAttributes<RuiTooltipElement, RuiTooltipProps>) {
	return (
		<rui-tooltip content={content} {...props}>
			<span class="rui-tooltip">
				<span class="rui-tooltip__trigger">{children}</span>
				<span class="rui-tooltip__content rui-floating" data-ref="tooltip" role="tooltip" hidden>
					{content}
				</span>
			</span>
		</rui-tooltip>
	);
}
