import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiCheckboxProps } from './checkbox.script';
import { RuiCheckbox as RuiCheckboxElement } from './checkbox.script';

export const RuiCheckbox = defineRadiantView(
	RuiCheckboxElement,
	({ children, ...props }: JsxHtmlPropsWithChildren<RuiCheckboxProps & { slot?: string }>) => (
		<rui-checkbox {...props}>{children}</rui-checkbox>
	),
	{ stylesheets: ['./checkbox.css'] },
);
