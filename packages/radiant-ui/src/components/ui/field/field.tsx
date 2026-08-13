import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import type { RuiFieldProps } from './field.script';
import './field.script';

/**
 * JSX helper around `<rui-field>`.
 *
 * Passes `rules` and `defaultValue` through property bindings, and serializes
 * `defaultValueData` through a data attribute. The element authors the
 * `.rui-field` surface (see `@cssclass` there).
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
			data={{
				defaultValue:
					defaultValueData ?? (defaultValue !== undefined ? JSON.stringify(defaultValue) : undefined),
			}}
		>
			{children}
		</rui-field>
	);
}
