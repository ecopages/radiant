import { type JsxCustomElementAttributes, type JsxElementProps, type JsxRenderable } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { cx } from '@/lib/cx';
import { RuiIconX } from '@/lib/icons';
import type { RuiDialog as RuiDialogElement, RuiDialogProps } from './dialog.script';
import './dialog.script';

export type RuiDialogTitleProps = JsxElementProps<HTMLDivElement>;

/**
 * Dialog title for the visible dialog name.
 *
 * @cssclass rui-dialog__title - Dialog title; `aria-labelledby` target.
 *
 * @remarks Stamps `[data-dialog-title]` and `data-ref="title"`.
 */
export function RuiDialogTitle({ children, class: className, ...props }: RuiDialogTitleProps) {
	return (
		<div {...props} data-dialog-title data-ref="title" class={cx('rui-dialog__title', className)}>
			{children}
		</div>
	);
}

export type RuiDialogBodyProps = JsxElementProps<HTMLDivElement>;

/**
 * Dialog body content.
 *
 * @cssclass rui-dialog__body - Dialog body; `aria-describedby` target.
 *
 * @remarks Stamps `[data-dialog-body]` and `data-ref="description"`.
 */
export function RuiDialogBody({ children, class: className, ...props }: RuiDialogBodyProps) {
	return (
		<div {...props} data-dialog-body data-ref="description" class={cx('rui-dialog__body', className)}>
			{children}
		</div>
	);
}

export type RuiDialogActionsProps = JsxElementProps<HTMLDivElement>;

/**
 * Action row for dialog buttons.
 *
 * @cssclass rui-dialog__actions - Right-aligned action row.
 */
export function RuiDialogActions({ children, class: className, ...props }: RuiDialogActionsProps) {
	return (
		<div {...props} class={cx('rui-dialog__actions', className)}>
			{children}
		</div>
	);
}

export type RuiDialogCloseProps = JsxElementProps<HTMLButtonElement>;

/**
 * Close control for the dialog surface.
 *
 * @cssclass rui-dialog__close - Dismiss button; dispatches `data-dialog-close` click.
 *
 * @remarks Stamps `[data-dialog-close]` and `data-ref="close"`.
 */
export function RuiDialogClose({ children, class: className, aria, ...props }: RuiDialogCloseProps) {
	return (
		<button
			{...props}
			aria={withDefaultAriaLabel(aria, 'Close')}
			type="button"
			data-dialog-close
			data-ref="close"
			class={cx('rui-dialog__close', className)}
		>
			{children ?? <RuiIconX />}
		</button>
	);
}

type DialogShellProps = {
	alert?: boolean;
	children: JsxRenderable;
	open?: boolean;
};

/**
 * View-owned dialog surface: root / backdrop / surface.
 *
 * @remarks Mirrored by `createDialogSurface` in `dialog-registry.ts`, which
 * rebuilds this structure imperatively for the programmatic host dialog. Edit
 * both together. Visibility differs by design: the view seeds SSR state with
 * `hidden={open ? undefined : true}`, while the registry relies on
 * `open = true` plus the controller's `syncOpenState()` on connect.
 */
function DialogShell({ alert, children, open }: DialogShellProps) {
	return (
		<div data-ref="root" class="rui-dialog" hidden={open ? undefined : true}>
			<div data-ref="backdrop" class="rui-dialog__backdrop"></div>
			<div
				data-ref="dialog"
				class="rui-dialog__surface"
				tabindex={-1}
				role={alert ? 'alertdialog' : 'dialog'}
				aria-modal="true"
			>
				{children}
			</div>
		</div>
	);
}

export type RuiDialogViewProps = Omit<JsxCustomElementAttributes<RuiDialogElement, RuiDialogProps>, 'title'> & {
	title?: JsxRenderable;
	actions?: JsxRenderable;
};

/**
 * Dialog view. Pass `title` / `actions` for the composite API; otherwise compose
 * `RuiDialogTitle`, `RuiDialogBody`, `RuiDialogActions`, and `RuiDialogClose` as children.
 *
 * @remarks The composite API SSRs a full `<rui-dialog>` shell (close button, title,
 * body, actions). When neither `title` nor `actions` is set, children are composed
 * inside the view-owned dialog shell.
 */
export function RuiDialog({ title, actions, children, open, alert, ...props }: RuiDialogViewProps) {
	if (title != null || actions != null) {
		return (
			<rui-dialog {...props} open={open} alert={alert}>
				<DialogShell open={open} alert={alert}>
					<RuiDialogClose />
					{title != null ? <RuiDialogTitle>{title}</RuiDialogTitle> : null}
					{children != null ? <RuiDialogBody>{children}</RuiDialogBody> : null}
					{actions != null ? <RuiDialogActions>{actions}</RuiDialogActions> : null}
				</DialogShell>
			</rui-dialog>
		);
	}

	return (
		<rui-dialog {...props} open={open} alert={alert}>
			<DialogShell open={open} alert={alert}>
				{children}
			</DialogShell>
		</rui-dialog>
	);
}
