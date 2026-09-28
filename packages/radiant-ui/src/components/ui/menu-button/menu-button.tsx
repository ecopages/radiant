import type { JsxCustomElementAttributes, JsxElementProps, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RuiIconChevronDown } from '@/lib/icons';
import { RuiButton, type RuiButtonControlProps } from '../button';
import { RuiSeparator } from '../separator';
import { renderMenuEntries, type RuiMenuEntry } from '../shared/menu-entry';
import type { RuiMenuButton as RuiMenuButtonElement, RuiMenuButtonProps } from './menu-button.script';
import './menu-button.script';

export type { RuiMenuEntry, RuiMenuItem, RuiMenuSeparator } from '../shared/menu-entry';

export type RuiMenuButtonTriggerProps = RuiButtonControlProps;

/** Menu button trigger. Stamps `data-ref="trigger"`. */
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
			<RuiIconChevronDown class="rui-menu-button__chevron" />
		</RuiButton>
	);
}

export type RuiMenuButtonContentProps = JsxElementProps<HTMLDivElement>;

/** Popup menu surface. Stamps `data-ref="menu"` and `role="menu"`. */
export function RuiMenuButtonContent({ children, class: className, ...props }: RuiMenuButtonContentProps) {
	return (
		<div
			{...props}
			data-ref="menu"
			class={cx('rui-menu-button__menu', 'rui-popover', 'rui-floating', className)}
			role="menu"
		>
			{children}
		</div>
	);
}

export type RuiMenuButtonSubmenuContentProps = JsxElementProps<HTMLDivElement>;

/**
 * Nested menu surface. Place it as the next sibling of the branch item so ARIA
 * linkage and positioning can pair them.
 *
 * @cssclass rui-menu-button__submenu - Nested popup menu surface.
 */
export function RuiMenuButtonSubmenuContent({
	children,
	class: className,
	...props
}: RuiMenuButtonSubmenuContentProps) {
	return (
		<div
			{...props}
			data-ref="submenu-menu"
			class={cx('rui-menu-button__menu', 'rui-menu-button__submenu', 'rui-popover', 'rui-floating', className)}
			role="menu"
			hidden
		>
			{children}
		</div>
	);
}

export type RuiMenuButtonItemProps = JsxElementProps<HTMLButtonElement> & {
	value: string;
	disabled?: boolean;
	hasSubmenu?: boolean;
};

/** Action item inside `RuiMenuButtonContent`. */
export function RuiMenuButtonItem({
	children,
	value,
	disabled,
	hasSubmenu,
	class: className,
	...props
}: RuiMenuButtonItemProps) {
	return (
		<button
			{...props}
			type="button"
			class={cx('rui-menu-button__item', className)}
			role="menuitem"
			data-value={value}
			aria-haspopup={hasSubmenu ? 'menu' : undefined}
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
 * Accepts a `trigger` label and recursive `items`; renders actions as
 * `role="menuitem"` buttons and separator entries as non-interactive dividers.
 *
 * @cssclass rui-menu-button__item - Menu item (`role="menuitem"`).
 */
export function RuiMenuButton({
	trigger,
	items,
	children,
	class: className,
	...props
}: JsxCustomElementAttributes<
	RuiMenuButtonElement,
	RuiMenuButtonProps & { trigger?: JsxRenderable; items?: RuiMenuEntry[] }
>) {
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
				{items
					? renderMenuEntries(items, {
							Item: (itemProps) => <RuiMenuButtonItem {...itemProps} />,
							Submenu: (submenuProps) => <RuiMenuButtonSubmenuContent {...submenuProps} />,
							Separator: (separatorProps) => <RuiSeparator key={separatorProps.id} />,
						})
					: children}
			</RuiMenuButtonContent>
		</rui-menu-button>
	);
}
