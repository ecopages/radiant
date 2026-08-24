import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiToolbar as RuiToolbarElement, RuiToolbarProps } from './toolbar.script';
import './toolbar.script';

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
