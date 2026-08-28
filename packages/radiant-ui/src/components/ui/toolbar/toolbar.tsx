import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiToolbar as RuiToolbarElement, RuiToolbarProps } from './toolbar.script';
import './toolbar.script';

/**
 * Toolbar landmark wrapper. Stamps `[role="toolbar"]` with `data-ref="root"`.
 *
 * @cssclass rui-toolbar - Toolbar surface (`role="toolbar"`).
 */
export function RuiToolbar({
	children,
	label,
	...props
}: JsxCustomElementAttributes<RuiToolbarElement, RuiToolbarProps>) {
	return (
		<rui-toolbar {...props} label={label}>
			<div class="rui-toolbar" data-ref="root" role="toolbar" aria-label={label || undefined}>
				{children}
			</div>
		</rui-toolbar>
	);
}
