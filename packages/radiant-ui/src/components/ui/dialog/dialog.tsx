import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiDialogProps } from './dialog.script';
import { RuiDialog as RuiDialogElement } from './dialog.script';
import './dialog.css';

function cx(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(' ');
}

export type RuiDialogTitleProps = RadiantSlotProps & {
	children: JsxRenderable;
	class?: string;
};

/** Dialog title slotted into `title` by default. */
export function RuiDialogTitle({ slot = 'title', children, class: className }: RuiDialogTitleProps) {
	return (
		<div slot={slot} data-dialog-title data-ref="title" class={cx('rui-dialog__title', className)}>
			{children}
		</div>
	);
}

export type RuiDialogBodyProps = {
	children: JsxRenderable;
	class?: string;
};

/** Dialog body in the default slot. */
export function RuiDialogBody({ children, class: className }: RuiDialogBodyProps) {
	return (
		<div data-dialog-body data-ref="description" class={cx('rui-dialog__body', className)}>
			{children}
		</div>
	);
}

export type RuiDialogActionsProps = RadiantSlotProps & {
	children: JsxRenderable;
	class?: string;
};

/** Action row slotted into `actions` by default. */
export function RuiDialogActions({ slot = 'actions', children, class: className }: RuiDialogActionsProps) {
	return (
		<div slot={slot} class={cx('rui-dialog__actions', className)}>
			{children}
		</div>
	);
}

export type RuiDialogCloseProps = RadiantSlotProps & {
	children?: JsxRenderable;
	class?: string;
	'aria-label'?: string;
};

/** Close control slotted into `close` by default. */
export function RuiDialogClose({
	slot = 'close',
	children,
	class: className,
	'aria-label': ariaLabel = 'Close',
}: RuiDialogCloseProps) {
	return (
		<button
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

export const RuiDialog = defineRadiantView(
	RuiDialogElement,
	({
		slot,
		open,
		alert,
		label,
		title,
		actions,
		children,
	}: RuiDialogProps &
		RadiantSlotProps & {
			title?: JsxRenderable;
			actions?: JsxRenderable;
			children?: JsxRenderable;
		}) => {
		if (title != null || actions != null) {
			return (
				<rui-dialog slot={slot} open={open} alert={alert} label={label}>
					<RuiDialogClose />
					{title != null ? <RuiDialogTitle>{title}</RuiDialogTitle> : null}
					{children != null ? <RuiDialogBody>{children}</RuiDialogBody> : null}
					{actions != null ? <RuiDialogActions>{actions}</RuiDialogActions> : null}
				</rui-dialog>
			);
		}

		return (
			<rui-dialog slot={slot} open={open} alert={alert} label={label}>
				{children}
			</rui-dialog>
		);
	},
);
