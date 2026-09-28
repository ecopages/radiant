import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiNavigationMenu as RuiNavigationMenuElement, RuiNavigationMenuProps } from './navigation-menu.script';
import './navigation-menu.script';

import { RuiButton, type RuiButtonControlProps } from '../button/button';

export type RuiNavigationMenuBarProps = JsxElementProps<HTMLDivElement>;

/**
 * Top-level trigger and link row inside `RuiNavigationMenu`. Stamps `[data-ref="bar"]`.
 *
 * @cssclass rui-navigation-menu__bar - Presentation class; not a query target.
 *
 * @remarks Bar chrome (fill, border, shadow, padding) defaults to transparent.
 * Override `--rui-navigation-menu-bar-*` on `rui-navigation-menu` to paint a box.
 */
export function RuiNavigationMenuBar({ children, class: className, ...props }: RuiNavigationMenuBarProps) {
	return (
		<div {...props} data-ref="bar" class={cx('rui-navigation-menu__bar', className)}>
			{children}
		</div>
	);
}

export type RuiNavigationMenuPanelsProps = JsxElementProps<HTMLDivElement>;

/**
 * Grouping wrapper for flyout panels. Stamps `[data-ref="panels"]`.
 *
 * @cssclass rui-navigation-menu__panels - Presentation class; not a query target.
 *
 * @remarks Does not create a layout box (`display: contents`). Panels are
 * positioned as popovers against their matching trigger.
 */
export function RuiNavigationMenuPanels({ children, class: className, ...props }: RuiNavigationMenuPanelsProps) {
	return (
		<div {...props} data-ref="panels" class={cx('rui-navigation-menu__panels', className)}>
			{children}
		</div>
	);
}

/**
 * Navigation menu view. Compose `RuiNavigationMenuBar`, triggers, links, and
 * panels as children. Children are wrapped in `nav[data-ref="root"]`.
 *
 * @cssclass rui-navigation-menu - Root `nav` surface (`[data-ref="root"]`).
 */
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

/**
 * Top-level megamenu trigger. Stamps `[data-navigation-item]`, `[data-navigation-trigger]`, and `data-value`.
 */
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

/** Plain navigation link. Stamps `[data-navigation-item]`. */
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

/**
 * Flyout panel paired with a trigger by `value`. Stamps `[data-navigation-panel]` and `data-value`.
 *
 * @cssclass rui-navigation-menu__panel - Panel layout on top of `rui-popover`.
 *
 * @remarks Always includes `rui-popover` and `rui-floating` chrome. The host
 * positions the open panel relative to its trigger.
 */
export function RuiNavigationMenuPanel({ children, value, class: className, ...props }: RuiNavigationMenuPanelProps) {
	return (
		<div
			{...props}
			class={cx('rui-navigation-menu__panel', 'rui-popover', 'rui-floating', className)}
			data-navigation-panel
			data-value={value}
		>
			{children}
		</div>
	);
}
