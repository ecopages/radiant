import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RuiTooltip as RuiTooltipElement, type RuiTooltipProps } from './tooltip.script';

/**
 * Tooltip view: stamps trigger wrapper and tooltip surface targets expected by the host.
 *
 * @cssclass rui-tooltip - Root wrapper.
 * @cssclass rui-tooltip__trigger - Trigger wrapper (focus bridge).
 * @cssclass rui-tooltip__content - Tooltip surface (`[data-ref="tooltip"]`, `role="tooltip"`).
 */
export function RuiTooltip({
	children,
	content = '',
	...props
}: JsxCustomElementAttributes<RuiTooltipElement, RuiTooltipProps>) {
	return (
		<RuiTooltipElement content={content} {...props}>
			<span class="rui-tooltip">
				<span class="rui-tooltip__trigger" data-ref="trigger">
					{children}
				</span>
				<span class="rui-tooltip__content rui-floating" data-ref="tooltip" role="tooltip" hidden>
					{content}
				</span>
			</span>
		</RuiTooltipElement>
	);
}
