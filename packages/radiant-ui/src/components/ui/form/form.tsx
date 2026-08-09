import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import type { RuiFormProps } from './form.script';
import './form.script';

export function RuiForm({
	children,
	defaultValues,
	defaultValuesData,
	resolver,
	reValidateMode,
	...props
}: JsxHtmlPropsWithChildren<RuiFormProps>) {
	return (
		<rui-form
			{...props}
			reValidateMode={reValidateMode}
			attr:revalidate-mode={reValidateMode}
			prop:defaultValues={defaultValues}
			prop:resolver={resolver}
			attr:data-default-values={
				defaultValuesData ?? (defaultValues !== undefined ? JSON.stringify(defaultValues) : undefined)
			}
		>
			{children}
		</rui-form>
	);
}

export type { RuiFormSubmitDetail, RuiFormInvalidDetail } from './form.script';
