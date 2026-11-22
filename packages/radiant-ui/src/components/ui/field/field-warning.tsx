import type { JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RUI_FIELD_WARNING_ATTR } from '@/lib/form/control-protocol';

export type RuiFieldWarningProps = JsxElementProps<HTMLParagraphElement>;

/**
 * Warning message region for a field. Stamps `[data-rui-field-warning]`.
 *
 * `<rui-field>` fills it from the warning an injected form store reports for the
 * field and hides it when there is none. A warning is advice: it never marks the
 * control invalid, never reaches `aria-invalid`, and never blocks submit.
 *
 * @cssclass rui-field__warning - Warning text; hidden until a warning is set.
 *
 * @remarks Renders `role="status"`, a polite live region, so a warning that appears
 * is announced without interrupting, unlike the `role="alert"` error region. It is
 * not added to the control's `aria-describedby`.
 */
export function RuiFieldWarning({ class: className, children, ...props }: RuiFieldWarningProps) {
	return (
		<p
			{...props}
			{...{ [RUI_FIELD_WARNING_ATTR]: '' }}
			class={cx('rui-field__warning', className)}
			role="status"
			hidden
		>
			{children}
		</p>
	);
}
