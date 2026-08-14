import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiToolbar as RuiToolbarElement, RuiToolbarProps } from './toolbar.script';
import './toolbar.script';

export function RuiToolbar({ children, ...props }: JsxCustomElementAttributes<RuiToolbarElement, RuiToolbarProps>) {
	return <rui-toolbar {...props}>{children}</rui-toolbar>;
}
