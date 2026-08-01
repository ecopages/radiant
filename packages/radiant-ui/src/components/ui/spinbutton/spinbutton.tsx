import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiSpinbuttonProps } from './spinbutton.script';
import { RuiSpinbutton as RuiSpinbuttonElement } from './spinbutton.script';

export const RuiSpinbutton = defineRadiantView(
	RuiSpinbuttonElement,
	({ children, ...props }: JsxHtmlPropsWithChildren<RuiSpinbuttonProps & { slot?: string }>) => (
		<rui-spinbutton {...props}>{children}</rui-spinbutton>
	),
	{ stylesheets: ['./spinbutton.css'] },
);
