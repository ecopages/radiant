import type { JsxHtmlPropsWithChildren, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiDialogProps } from './dialog.script';
import './dialog.script';

export type RuiDialogTitleProps = JsxHtmlPropsWithChildren<{
	slot?: string;
}>;

/**
 * Dialog title slotted into `title` by default.
 *
 * @cssclass rui-dialog__title - Dialog title; `aria-labelledby` target.
 */
export function RuiDialogTitle({ children, slot = 'title', class: className, ...props }: RuiDialogTitleProps) {
	return (
		<div {...props} slot={slot} data-dialog-title data-ref="title" class={cx('rui-dialog__title', className)}>
			{children}
		</div>
	);
}

export type RuiDialogBodyProps = JsxHtmlPropsWithChildren;

/**
 * Dialog body in the default slot.
 *
 * @cssclass rui-dialog__body - Dialog body; `aria-describedby` target.
 */
export function RuiDialogBody({ children, class: className, ...props }: RuiDialogBodyProps) {
	return (
		<div {...props} data-dialog-body data-ref="description" class={cx('rui-dialog__body', className)}>
			{children}
		</div>
	);
}

export type RuiDialogActionsProps = JsxHtmlPropsWithChildren<{
	slot?: string;
}>;

/**
 * Action row slotted into `actions` by default.
 *
 * @cssclass rui-dialog__actions - Right-aligned action row.
 */
export function RuiDialogActions({ children, slot = 'actions', class: className, ...props }: RuiDialogActionsProps) {
	return (
		<div {...props} slot={slot} class={cx('rui-dialog__actions', className)}>
			{children}
		</div>
	);
}

export type RuiDialogCloseProps = JsxHtmlPropsWithChildren<{
	slot?: string;
	'aria-label'?: string;
}>;

/**
 * Close control slotted into `close` by default.
 *
 * @cssclass rui-dialog__close - Dismiss button; dispatches `data-dialog-close` click.
 */
export function RuiDialogClose({
	children,
	slot = 'close',
	class: className,
	'aria-label': ariaLabel = 'Close',
	...props
}: RuiDialogCloseProps) {
	return (
		<button
			{...props}
			slot={slot}
			type="button"
			data-dialog-close
			data-ref="close"
			class={cx('rui-dialog__close', className)}
			aria-label={ariaLabel}
		>
			{children ?? '×'}
		</button>
	);
}

export type RuiDialogViewProps = JsxHtmlPropsWithChildren<
	RuiDialogProps & {
		slot?: string;
		id?: string;
		title?: JsxRenderable;
		actions?: JsxRenderable;
	}
>;

/**
 * Dialog view. Pass `title` / `actions` for the composite API; otherwise compose
 * `RuiDialogTitle`, `RuiDialogBody`, `RuiDialogActions`, and `RuiDialogClose` as children.
 *
 * @remarks The composite API SSRs a full `<rui-dialog>` shell (close button, title,
 * body, actions). When neither `title` nor `actions` is set, children are projected
 * as-is so callers can arrange slotted parts themselves.
 */
export function RuiDialog({ title, actions, children, ...props }: RuiDialogViewProps) {
	if (title != null || actions != null) {
		return (
			<rui-dialog {...props}>
				<RuiDialogClose />
				{title != null ? <RuiDialogTitle>{title}</RuiDialogTitle> : null}
				{children != null ? <RuiDialogBody>{children}</RuiDialogBody> : null}
				{actions != null ? <RuiDialogActions>{actions}</RuiDialogActions> : null}
			</rui-dialog>
		);
	}

	return <rui-dialog {...props}>{children}</rui-dialog>;
}
