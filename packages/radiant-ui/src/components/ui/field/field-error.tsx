import type { JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RUI_FIELD_ERROR_ATTR } from '../form/control-protocol';

export type RuiFieldErrorProps = JsxElementProps<HTMLParagraphElement>;

/**
 * Error message region for a field. Stamps `[data-rui-field-error]`.
 * Text is populated by `<rui-field>` from form validation or the field's `error` prop.
 *
 * @cssclass rui-field__error - Error text; hidden until a message is set.
 *
 * @remarks Renders `role="alert"` and is wired into the control's
 * `aria-describedby` by `<rui-field>`.
 */
export function RuiFieldError({ class: className, ...props }: RuiFieldErrorProps) {
	return (
		<p
			{...props}
			{...{ [RUI_FIELD_ERROR_ATTR]: '' }}
			class={cx('rui-field__error', className)}
			role="alert"
			hidden
		></p>
	);
}
