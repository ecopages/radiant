import type { JsxElementProps, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RUI_FIELD_ERROR_ATTR, RUI_FIELD_ERROR_CONTROLLED_ATTR } from '../form/control-protocol';

export type RuiFieldErrorProps = JsxElementProps<HTMLParagraphElement> & {
	/**
	 * Controlled message. When set (even to an empty value) the author owns this region: it renders the message,
	 * is visible while it has content, and the enclosing `<rui-field>` neither overwrites nor hides it.
	 */
	error?: JsxRenderable;
};

/**
 * Error message region for a field. Stamps `[data-rui-field-error]`.
 *
 * By default the text is populated by `<rui-field>` from form validation or the field's `error` prop.
 * With `error`, the region is controlled: it renders `error` (falling back to `children`) and stamps
 * `[data-rui-field-error-controlled]`, so it also shows outside a `<rui-field>` and on the server. Use it for an
 * error that belongs to a group or a repeating array rather than to one control.
 *
 * @cssclass rui-field__error - Error text; hidden until a message is set.
 *
 * @remarks Renders `role="alert"`. Inside a field, the uncontrolled region is wired into the control's
 * `aria-describedby` by `<rui-field>`; a controlled region gets an `id` when it has none and is listed there
 * while visible. For a group without a control, point `aria-describedby` or `aria-errormessage` at the region's `id`.
 */
export function RuiFieldError({ class: className, error, children, ...props }: RuiFieldErrorProps) {
	const controlled = error !== undefined;
	const content = hasContent(error) ? error : children;
	const visible = controlled && hasContent(content);

	return (
		<p
			{...props}
			{...{ [RUI_FIELD_ERROR_ATTR]: '' }}
			{...(controlled ? { [RUI_FIELD_ERROR_CONTROLLED_ATTR]: '' } : {})}
			class={cx('rui-field__error', className)}
			role="alert"
			hidden={!visible}
		>
			{controlled ? content : undefined}
		</p>
	);
}

function hasContent(value: JsxRenderable | undefined): boolean {
	return value !== undefined && value !== null && value !== false && value !== '';
}
