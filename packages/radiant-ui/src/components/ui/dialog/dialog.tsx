import type { JsxHtmlPropsWithChildren, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiDialogProps } from './dialog.script';
import { RuiDialog as RuiDialogElement } from './dialog.script';

export type RuiDialogTitleProps = JsxHtmlPropsWithChildren<{
	slot?: string;
}>;

/** Dialog title slotted into `title` by default. */
export function RuiDialogTitle({ children, slot = 'title', class: className, ...props }: RuiDialogTitleProps) {
	return (
		<div {...props} slot={slot} data-dialog-title data-ref="title" class={cx('rui-dialog__title', className)}>
			{children}
		</div>
	);
}

export type RuiDialogBodyProps = JsxHtmlPropsWithChildren;

/** Dialog body in the default slot. */
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

/** Action row slotted into `actions` by default. */
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

/** Close control slotted into `close` by default. */
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

export const RuiDialog = defineRadiantView(
	RuiDialogElement,
	({ title, actions, children, ...props }: RuiDialogViewProps) => {
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
	},
	{ stylesheets: ['./dialog.css'] },
);
