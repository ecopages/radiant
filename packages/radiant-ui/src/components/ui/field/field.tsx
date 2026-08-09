import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import type { RuiFieldProps } from './field.script';
import './field.script';

export function RuiField({
	children,
	rules,
	defaultValue,
	defaultValueData,
	...props
}: JsxHtmlPropsWithChildren<RuiFieldProps>) {
	return (
		<rui-field
			{...props}
			prop:rules={rules}
			prop:defaultValue={defaultValue}
			attr:data-default-value={
				defaultValueData ?? (defaultValue !== undefined ? JSON.stringify(defaultValue) : undefined)
			}
		>
			{children}
		</rui-field>
	);
}
