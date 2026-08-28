import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiField as RuiFieldElement, RuiFieldProps } from './field.script';
import './field.script';

/**
 * Field wrapper. Authors a `.rui-field` column inside `<rui-field>` and passes
 * `rules` / `defaultValue` through property bindings.
 *
 * @cssclass rui-field - Root column; wires the composed control, label, description,
 *   and error into the form-published presentation.
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
