import type { JsxRenderable } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RadiantSlotProps } from '@/types';
import { RuiButton, type RuiButtonProps } from '../button/button';
import type { RuiNavigationMenuProps } from './navigation-menu.script';
import { RuiNavigationMenu as RuiNavigationMenuElement } from './navigation-menu.script';
import './navigation-menu.css';

function cx(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(' ');
}

export const RuiNavigationMenu = defineRadiantView(
	RuiNavigationMenuElement,
	({ label, children, slot }: RuiNavigationMenuProps & RadiantSlotProps & { children: JsxRenderable }) => (
		<rui-navigation-menu slot={slot} label={label}>
			{children}
		</rui-navigation-menu>
	),
);

export type RuiNavigationMenuTriggerProps = RadiantSlotProps &
	Pick<RuiButtonProps, 'variant' | 'disabled' | 'class' | 'type'> & {
		value: string;
		children: JsxRenderable;
	};

/** Top-level megamenu trigger slotted into `triggers` by default. */
export function RuiNavigationMenuTrigger({
	slot = 'triggers',
	value,
	children,
	variant = 'ghost',
	...rest
}: RuiNavigationMenuTriggerProps) {
	return (
		<RuiButton
			slot={slot}
			variant={variant}
			data-navigation-item
			data-navigation-trigger
			data-value={value}
			{...rest}
		>
			{children}
		</RuiButton>
	);
}

export type RuiNavigationMenuLinkProps = RadiantSlotProps & {
	href: string;
	children: JsxRenderable;
	class?: string;
};

/** Plain navigation link slotted into `triggers` by default. */
export function RuiNavigationMenuLink({
	slot = 'triggers',
	href,
	children,
	class: className,
}: RuiNavigationMenuLinkProps) {
	return (
		<a
			slot={slot}
			href={href}
			data-navigation-item
			class={cx('rui-button', 'rui-button--ghost', 'rui-button--md', className)}
		>
			{children}
		</a>
	);
}

export type RuiNavigationMenuPanelProps = RadiantSlotProps & {
	value: string;
	children: JsxRenderable;
	class?: string;
};

/** Megamenu panel slotted into `panels` by default. */
export function RuiNavigationMenuPanel({
	slot = 'panels',
	value,
	children,
	class: className,
}: RuiNavigationMenuPanelProps) {
	return (
		<div slot={slot} class={className} data-navigation-panel data-value={value}>
			{children}
		</div>
	);
}
