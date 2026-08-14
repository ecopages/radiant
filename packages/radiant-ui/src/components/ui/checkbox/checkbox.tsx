import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiCheckbox as RuiCheckboxElement, RuiCheckboxProps } from './checkbox.script';
import './checkbox.script';

export function RuiCheckbox({ children, ...props }: JsxCustomElementAttributes<RuiCheckboxElement, RuiCheckboxProps>) {
	return <rui-checkbox {...props}>{children}</rui-checkbox>;
}
