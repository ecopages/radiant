import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiNavigationMenu as RuiNavigationMenuElement, RuiNavigationMenuProps } from './navigation-menu.script';
import './navigation-menu.script';

import { RuiButton, type RuiButtonControlProps } from '../button/button';

export function RuiNavigationMenu({
	children,
	...props
}: JsxCustomElementAttributes<RuiNavigationMenuElement, RuiNavigationMenuProps>) {
	return <rui-navigation-menu {...props}>{children}</rui-navigation-menu>;
}

export type RuiNavigationMenuTriggerProps = RuiButtonControlProps & {
	value: string;
};

/** Top-level megamenu trigger slotted into `triggers` by default. */
export function RuiNavigationMenuTrigger({
	children,
	slot = 'triggers',
	value,
	variant = 'ghost',
	...props
}: RuiNavigationMenuTriggerProps) {
	return (
		<RuiButton
			{...props}
			slot={slot}
			variant={variant}
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

/** Plain navigation link slotted into `triggers` by default. */
export function RuiNavigationMenuLink({
	children,
	slot = 'triggers',
	href,
	class: className,
	...props
}: RuiNavigationMenuLinkProps) {
	return (
		<a
			{...props}
			slot={slot}
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

/** Megamenu panel slotted into `panels` by default. */
export function RuiNavigationMenuPanel({
	children,
	slot = 'panels',
	value,
	class: className,
	...props
}: RuiNavigationMenuPanelProps) {
	return (
		<div {...props} slot={slot} class={className} data-navigation-panel data-value={value}>
			{children}
		</div>
	);
}
