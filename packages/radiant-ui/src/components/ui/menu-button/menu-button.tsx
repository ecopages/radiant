import type { JsxHtmlPropsWithChildren, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RuiButton, type RuiButtonControlProps } from '../button';
import type { RuiMenuButtonProps } from './menu-button.script';
import './menu-button.script';

export type RuiMenuItem = {
	value: string;
	label: JsxRenderable;
	disabled?: boolean;
};

export type RuiMenuButtonTriggerProps = JsxHtmlPropsWithChildren<
	Pick<RuiButtonControlProps, 'variant' | 'size' | 'type' | 'disabled' | 'aria-label'>
>;

/** Trigger button for opening a menu-button popup. */
export function RuiMenuButtonTrigger({
	children,
	class: className,
	variant = 'filled',
	size = 'md',
	...props
}: RuiMenuButtonTriggerProps) {
	return (
		<RuiButton
			{...props}
			variant={variant}
			size={size}
			data-ref="trigger"
			class={cx('rui-menu-button__trigger', className)}
			aria-haspopup="menu"
		>
			{children}
			<span class="rui-menu-button__chevron" aria-hidden="true" />
		</RuiButton>
	);
}

export type RuiMenuButtonContentProps = JsxHtmlPropsWithChildren;

/** Floating menu surface containing `RuiMenuButtonItem` elements. */
export function RuiMenuButtonContent({ children, class: className, ...props }: RuiMenuButtonContentProps) {
	return (
		<div
			{...props}
			data-ref="menu"
			class={cx('rui-menu-button__menu', 'rui-popover', 'rui-floating', className)}
			role="menu"
			hidden
		>
			{children}
		</div>
	);
}

export type RuiMenuButtonItemProps = JsxHtmlPropsWithChildren<{
	value: string;
	disabled?: boolean;
}>;

/** Action item inside `RuiMenuButtonContent`. */
export function RuiMenuButtonItem({ children, value, disabled, class: className, ...props }: RuiMenuButtonItemProps) {
	return (
		<button
			{...props}
			type="button"
			class={cx('rui-menu-button__item', className)}
			role="menuitem"
			data-value={value}
			aria-disabled={disabled ? 'true' : undefined}
			disabled={disabled}
			tabIndex={-1}
		>
			{children}
		</button>
	);
}

/**
 * Importable JSX helper around `<rui-menu-button>`.
 *
 * Accepts a `trigger` label and `items`; renders the popup items as
 * `role="menuitem"` buttons.
 *
 * @cssclass rui-menu-button__item - Menu item (`role="menuitem"`).
 */
export function RuiMenuButton({
	trigger,
	items,
	children,
	class: className,
	...props
}: JsxHtmlPropsWithChildren<RuiMenuButtonProps & { slot?: string; trigger?: JsxRenderable; items?: RuiMenuItem[] }>) {
	if (trigger == null && items == null) {
		return (
			<rui-menu-button {...props} class={cx('rui-menu-button', className)}>
				{children}
			</rui-menu-button>
		);
	}

	return (
		<rui-menu-button {...props} class={cx('rui-menu-button', className)}>
			<RuiMenuButtonTrigger>{trigger}</RuiMenuButtonTrigger>
			<RuiMenuButtonContent>
				{items?.map((item) => (
					<RuiMenuButtonItem value={item.value} disabled={item.disabled}>
						{item.label}
					</RuiMenuButtonItem>
				))}
			</RuiMenuButtonContent>
		</rui-menu-button>
	);
}
