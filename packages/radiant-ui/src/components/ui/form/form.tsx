import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiForm as RuiFormElement, RuiFormProps } from './form.script';
import './form.script';

/**
 * Form coordinator view. Stamps `form.rui-form` with `[data-ref="form"]` and passes
 * `defaultValues`, `resolver`, and `onSubmit` through property bindings.
 *
 * @cssclass rui-form - Root form surface (`<form noValidate>`).
 */
export function RuiForm({
	children,
	defaultValues,
	defaultValuesData,
	resolver,
	reValidateMode,
	onSubmit,
	action,
	method,
	...props
}: JsxCustomElementAttributes<RuiFormElement, RuiFormProps>) {
	return (
		<rui-form
			{...props}
			action={action}
			method={method}
			reValidateMode={reValidateMode}
			attr:revalidate-mode={reValidateMode}
			prop:defaultValues={defaultValues}
			prop:resolver={resolver}
			prop:onSubmit={onSubmit}
			data={{
				defaultValues:
					defaultValuesData ?? (defaultValues !== undefined ? JSON.stringify(defaultValues) : undefined),
			}}
		>
			<form class="rui-form" data-ref="form" noValidate action={action} method={method}>
				{children}
			</form>
		</rui-form>
	);
}

export type { RuiFormSubmitDetail, RuiFormInvalidDetail } from './form.script';
