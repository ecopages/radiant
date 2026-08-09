import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import type { RuiCheckboxProps } from './checkbox.script';
import './checkbox.script';

export function RuiCheckbox({ children, ...props }: JsxHtmlPropsWithChildren<RuiCheckboxProps & { slot?: string }>) {
	return <rui-checkbox {...props}>{children}</rui-checkbox>;
}
