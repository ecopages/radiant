import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiNavigationMenuProps } from './navigation-menu.script';
import { RuiNavigationMenu as RuiNavigationMenuElement } from './navigation-menu.script';
import { RuiButton, type RuiButtonControlProps } from '../button/button';

export const RuiNavigationMenu = defineRadiantView(
	RuiNavigationMenuElement,
	({ children, ...props }: JsxHtmlPropsWithChildren<RuiNavigationMenuProps & { slot?: string }>) => (
		<rui-navigation-menu {...props}>{children}</rui-navigation-menu>
	),
	{ stylesheets: ['./navigation-menu.css'] },
);

export type RuiNavigationMenuTriggerProps = JsxHtmlPropsWithChildren<
	Pick<RuiButtonControlProps, 'variant' | 'disabled' | 'class' | 'type'> & {
		slot?: string;
		value: string;
	}
>;

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

export type RuiNavigationMenuLinkProps = JsxHtmlPropsWithChildren<{
	slot?: string;
	href: string;
}>;

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

export type RuiNavigationMenuPanelProps = JsxHtmlPropsWithChildren<{
	slot?: string;
	value: string;
}>;

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
