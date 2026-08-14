import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiForm as RuiFormElement, RuiFormProps } from './form.script';
import './form.script';

export function RuiForm({
	children,
	defaultValues,
	defaultValuesData,
	resolver,
	reValidateMode,
	...props
}: JsxCustomElementAttributes<RuiFormElement, RuiFormProps>) {
	return (
		<rui-form
			{...props}
			reValidateMode={reValidateMode}
			attr:revalidate-mode={reValidateMode}
			prop:defaultValues={defaultValues}
			prop:resolver={resolver}
			data={{
				defaultValues:
					defaultValuesData ?? (defaultValues !== undefined ? JSON.stringify(defaultValues) : undefined),
			}}
		>
			{children}
		</rui-form>
	);
}

export type { RuiFormSubmitDetail, RuiFormInvalidDetail } from './form.script';
