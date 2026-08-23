import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiField as RuiFieldElement, RuiFieldProps } from './field.script';
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
}: JsxCustomElementAttributes<RuiFieldElement, RuiFieldProps>) {
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
			<div class="rui-field">{children}</div>
		</rui-field>
	);
}
