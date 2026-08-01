import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiToolbarProps } from './toolbar.script';
import { RuiToolbar as RuiToolbarElement } from './toolbar.script';

export const RuiToolbar = defineRadiantView(
	RuiToolbarElement,
	({ children, ...props }: JsxHtmlPropsWithChildren<RuiToolbarProps & { slot?: string }>) => (
		<rui-toolbar {...props}>{children}</rui-toolbar>
	),
	{ stylesheets: ['./toolbar.css'] },
);
