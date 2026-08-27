import type { JsxCustomElementAttributes, JsxElementProps, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RuiSeparator } from '../separator';
import { renderMenuEntries, type RuiMenuEntry } from '../shared/menu-entry';
import type { RuiMenubar as RuiMenubarElement, RuiMenubarProps } from './menubar.script';
import './menubar.script';

export type { RuiMenuEntry, RuiMenuItem, RuiMenuSeparator } from '../shared/menu-entry';

export type RuiMenubarItem = {
	id: string;
	label: JsxRenderable;
	/** Popup actions. When present, the top item opens a `role="menu"`. */
	items?: RuiMenuEntry[];
	disabled?: boolean;
};

export type RuiMenubarMenuProps = {
	label: JsxRenderable;
	children?: JsxRenderable;
	disabled?: boolean;
};

/** Top-level menubar menu containing a trigger and its popup content. */
export function RuiMenubarMenu({ label, children, disabled }: RuiMenubarMenuProps) {
	const hasMenu = children != null;
	return (
		<div class="rui-menubar__root" data-ref="menubar-root">
			<button
				type="button"
				class="rui-menubar__item"
				role="menuitem"
				tabindex={-1}
				aria-haspopup={hasMenu ? 'true' : undefined}
				aria-expanded={hasMenu ? 'false' : undefined}
				aria-disabled={disabled ? 'true' : undefined}
				disabled={disabled}
			>
				{label}
			</button>
			{hasMenu ? (
				<div class="rui-menubar__menu rui-popover rui-floating" data-ref="menu" role="menu" hidden>
					{children}
				</div>
			) : null}
		</div>
	);
}

export type RuiMenubarMenuItemProps = Omit<JsxElementProps<HTMLButtonElement>, 'value'> & {
	value: string;
	disabled?: boolean;
	hasSubmenu?: boolean;
};

/** Action item inside a menubar popup. */
export function RuiMenubarMenuItem({
	children,
	value,
	disabled,
	hasSubmenu,
	class: className,
	...props
}: RuiMenubarMenuItemProps) {
	return (
		<button
			{...props}
			type="button"
			class={cx('rui-menubar__menu-item', className)}
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

export type RuiMenubarSubmenuContentProps = JsxElementProps<HTMLDivElement>;

/**
 * Nested menu surface. Place it as the next sibling of the branch item so ARIA
 * linkage and positioning can pair them.
 *
 * @cssclass rui-menubar__submenu - Nested popup menu surface.
 */
export function RuiMenubarSubmenuContent({ children, class: className, ...props }: RuiMenubarSubmenuContentProps) {
	return (
		<div
			{...props}
			data-ref="submenu-menu"
			class={cx('rui-menubar__menu', 'rui-menubar__submenu', 'rui-popover', 'rui-floating', className)}
			role="menu"
			hidden
		>
			{children}
		</div>
	);
}

/**
 * Importable JSX helper around `<rui-menubar>`.
 *
 * Renders `items` as a top-level `role="menuitem"` bar with optional
 * `role="menu"` popups. Popup entries can include non-interactive separators.
 *
 * @cssclass rui-menubar__root - Top-level menu root (trigger + optional popup).
 * @cssclass rui-menubar__item - Top-level item (`role="menuitem"`).
 * @cssclass rui-menubar__menu - Popup menu surface (`role="menu"`, `rui-popover`).
 * @cssclass rui-menubar__menu-item - Item inside a popup (`role="menuitem"`).
 */
export function RuiMenubar({
	items,
	label,
	children,
	...props
}: JsxCustomElementAttributes<RuiMenubarElement, RuiMenubarProps & { items?: RuiMenubarItem[] }>) {
	const content =
		items != null
			? items.map((item) => (
					<RuiMenubarMenu label={item.label} disabled={item.disabled}>
						{item.items?.length
							? renderMenuEntries(item.items, {
									Item: (itemProps) => <RuiMenubarMenuItem {...itemProps} />,
									Submenu: (submenuProps) => <RuiMenubarSubmenuContent {...submenuProps} />,
									Separator: (separatorProps) => <RuiSeparator key={separatorProps.id} />,
								})
							: null}
					</RuiMenubarMenu>
				))
			: children;

	return (
		<rui-menubar {...props} label={label}>
			<div class="rui-menubar" data-ref="root" role="menubar" aria-label={label || undefined}>
				{content}
			</div>
		</rui-menubar>
	);
}
