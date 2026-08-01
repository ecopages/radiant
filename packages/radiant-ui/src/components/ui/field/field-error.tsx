import { RUI_FIELD_ERROR_ATTR } from '../form/control-protocol';

export type RuiFieldErrorProps = {
	class?: string;
};

/**
 * Error message region for a field. Text is populated by `<rui-field>` from form validation
 * or the field's `error` prop.
 */
export function RuiFieldError({ class: className }: RuiFieldErrorProps) {
	return (
		<p
			{...{ [RUI_FIELD_ERROR_ATTR]: '' }}
			class={['rui-field__error', className].filter(Boolean).join(' ')}
			role="alert"
			hidden
		></p>
	);
}
