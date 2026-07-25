import type { WithChildren } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiFormProps } from './form.script';
import { RuiForm as RuiFormElement } from './form.script';
import './form.css';

export const RuiForm = defineRadiantView(
	RuiFormElement,
	({
		defaultValues,
		defaultValuesData,
		resolver,
		mode,
		reValidateMode,
		children,
	}: WithChildren<RuiFormProps>) => (
		<rui-form
			mode={mode}
			reValidateMode={reValidateMode}
			attr:revalidate-mode={reValidateMode}
			prop:defaultValues={defaultValues}
			prop:resolver={resolver}
			attr:data-default-values={
				defaultValuesData ??
				(defaultValues !== undefined ? JSON.stringify(defaultValues) : undefined)
			}
		>
			{children}
		</rui-form>
	),
);

export type { RuiFormSubmitDetail, RuiFormInvalidDetail } from './form.script';
