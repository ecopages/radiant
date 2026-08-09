import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import type { RuiFieldProps } from './field.script';
import './field.script';

/**
 * JSX helper around `<rui-field>`.
 *
 * Passes `rules`, `defaultValue`, and `defaultValueData` through `prop:` / `attr:`
 * bindings. The element authors the `.rui-field` surface (see `@cssclass` there).
 */
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
