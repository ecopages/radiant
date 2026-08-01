import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiSwitchProps } from './switch.script';
import { RuiSwitch as RuiSwitchElement } from './switch.script';

export const RuiSwitch = defineRadiantView(
	RuiSwitchElement,
	({ children, ...props }: JsxHtmlPropsWithChildren<RuiSwitchProps & { slot?: string }>) => (
		<rui-switch {...props}>{children}</rui-switch>
	),
	{ stylesheets: ['./switch.css'] },
);
