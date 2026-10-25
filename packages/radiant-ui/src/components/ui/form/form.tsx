import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RuiForm as RuiFormElement, type RuiFormProps } from './form.script';

/**
 * Form coordinator view. Stamps `[data-ref="form"]` on the native `<form>` and passes
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
		<RuiFormElement
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
		</RuiFormElement>
	);
}

export type { RuiFormSubmitDetail, RuiFormInvalidDetail } from './form.script';
