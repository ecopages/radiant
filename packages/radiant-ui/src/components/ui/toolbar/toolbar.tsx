import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import type { RuiToolbarProps } from './toolbar.script';
import './toolbar.script';

export function RuiToolbar({ children, ...props }: JsxHtmlPropsWithChildren<RuiToolbarProps & { slot?: string }>) {
	return <rui-toolbar {...props}>{children}</rui-toolbar>;
}
