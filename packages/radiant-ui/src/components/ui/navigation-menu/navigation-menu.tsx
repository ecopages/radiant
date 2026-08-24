import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiNavigationMenu as RuiNavigationMenuElement, RuiNavigationMenuProps } from './navigation-menu.script';
import './navigation-menu.script';

import { RuiButton, type RuiButtonControlProps } from '../button/button';

export type RuiNavigationMenuBarProps = JsxElementProps<HTMLDivElement>;

/** Top-level trigger and link row inside `RuiNavigationMenu`. */
export function RuiNavigationMenuBar({ children, class: className, ...props }: RuiNavigationMenuBarProps) {
	return (
		<div {...props} data-ref="bar" class={cx('rui-navigation-menu__bar', className)}>
			{children}
		</div>
	);
}

export type RuiNavigationMenuPanelsProps = JsxElementProps<HTMLDivElement>;

/** Megamenu panel region inside `RuiNavigationMenu`. */
export function RuiNavigationMenuPanels({ children, class: className, ...props }: RuiNavigationMenuPanelsProps) {
	return (
		<div {...props} data-ref="panels" class={cx('rui-navigation-menu__panels', className)}>
			{children}
		</div>
	);
}

export function RuiNavigationMenu({
	children,
	label,
	...props
}: JsxCustomElementAttributes<RuiNavigationMenuElement, RuiNavigationMenuProps>) {
	return (
		<rui-navigation-menu {...props} label={label}>
			<nav class="rui-navigation-menu" data-ref="root" aria-label={label || undefined}>
				{children}
			</nav>
		</rui-navigation-menu>
	);
}

export type RuiNavigationMenuTriggerProps = RuiButtonControlProps & {
	value: string;
};

/** Top-level megamenu trigger. Place inside `RuiNavigationMenuBar`. */
export function RuiNavigationMenuTrigger({
	children,
	value,
	variant = 'ghost',
	class: className,
	...props
}: RuiNavigationMenuTriggerProps) {
	return (
		<RuiButton
			{...props}
			variant={variant}
			class={className}
			data-navigation-item
			data-navigation-trigger
			data-value={value}
		>
			{children}
		</RuiButton>
	);
}

export type RuiNavigationMenuLinkProps = JsxElementProps<HTMLAnchorElement> & {
	href: string;
};

/** Plain navigation link. Place inside `RuiNavigationMenuBar`. */
export function RuiNavigationMenuLink({ children, href, class: className, ...props }: RuiNavigationMenuLinkProps) {
	return (
		<a
			{...props}
			href={href}
			data-navigation-item
			class={cx('rui-button', 'rui-button--ghost', 'rui-button--md', className)}
		>
			{children}
		</a>
	);
}

export type RuiNavigationMenuPanelProps = JsxElementProps<HTMLDivElement> & {
	value: string;
};

/** Megamenu panel paired with a trigger by `value`. Place inside `RuiNavigationMenuPanels`. */
export function RuiNavigationMenuPanel({ children, value, class: className, ...props }: RuiNavigationMenuPanelProps) {
	return (
		<div {...props} class={className} data-navigation-panel data-value={value}>
			{children}
		</div>
	);
}
