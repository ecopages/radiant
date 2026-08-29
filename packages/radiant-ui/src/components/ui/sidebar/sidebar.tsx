import { type JsxCustomElementAttributes, type JsxElementProps, type JsxRenderable } from '@ecopages/jsx';
import { withDefaultAriaLabel } from '@/aria';
import { coalesceDefined } from '@/lib/coalesce-defined';
import { cx } from '@/lib/cx';
import { omitProps } from '@/lib/omit-props';
import type { RuiSidebar as RuiSidebarElement, RuiSidebarProps } from './sidebar.script';
import './sidebar.script';

import type { RuiSidebarTrigger as RuiSidebarTriggerElement, RuiSidebarTriggerProps } from './sidebar-trigger.script';
import './sidebar-trigger.script';

export type RuiSidebarProviderProps = JsxElementProps<HTMLDivElement> & {
	/**
	 * Layout context. `default` is the standard shell; `full` removes chrome;
	 * `docs` stacks a full-width `siteHeader` above the sidebar + inset row.
	 */
	layout?: 'default' | 'full' | 'docs';
	/** Full-width chrome rendered above the sidebar row when `layout="docs"`. */
	siteHeader?: JsxRenderable;
	/** Slot for the sidebar element. */
	sidebar?: JsxRenderable;
	/** Slot for the inset (main content). */
	children?: JsxRenderable;
};

/**
 * `<div>` shell that wraps the sidebar and the main inset. Reflects
 * `data-layout` so stylesheets can adapt. Plays the role of
 * `SidebarProvider` from common sidebar kits, but without a runtime context —
 * coordination between trigger, sidebar, and inset is achieved through
 * `id`/`aria-controls` and shared `data-*` attributes.
 *
 * @cssclass rui-sidebar-provider - Shell wrapping sidebar + inset.
 * @cssclass rui-sidebar-provider__site-header - Full-width chrome (`layout="docs"`).
 * @cssclass rui-sidebar-provider__body - Sidebar + inset row.
 */
export function RuiSidebarProvider({
	layout = 'default',
	siteHeader,
	sidebar,
	children,
	class: className,
	...props
}: RuiSidebarProviderProps) {
	if (layout === 'docs') {
		return (
			<div {...props} class={cx('rui-sidebar-provider', className)} data-layout={layout}>
				{siteHeader ? <div class="rui-sidebar-provider__site-header">{siteHeader}</div> : null}
				<div class="rui-sidebar-provider__body">
					{sidebar}
					{children}
				</div>
			</div>
		);
	}

	return (
		<div {...props} class={cx('rui-sidebar-provider', className)} data-layout={layout}>
			{sidebar}
			{children}
		</div>
	);
}

export type RuiSidebarHeaderProps = JsxElementProps<HTMLDivElement>;

/**
 * Top section of the sidebar pane (logo, search, primary trigger).
 *
 * @cssclass rui-sidebar__header - Top, pinned section.
 */
export function RuiSidebarHeader({ children, class: className, ...props }: RuiSidebarHeaderProps) {
	return (
		<div {...props} class={cx('rui-sidebar__header', className)}>
			{children}
		</div>
	);
}

export type RuiSidebarContentProps = JsxElementProps<HTMLDivElement>;

/**
 * Scrollable middle section. Multiple allowed; each becomes its own region.
 *
 * @cssclass rui-sidebar__content - Scrollable middle section.
 */
export function RuiSidebarContent({ children, class: className, ...props }: RuiSidebarContentProps) {
	return (
		<div {...props} class={cx('rui-sidebar__content', className)}>
			{children}
		</div>
	);
}

export type RuiSidebarFooterProps = JsxElementProps<HTMLDivElement>;

/**
 * Pinned bottom section (user, theme toggle, settings).
 *
 * @cssclass rui-sidebar__footer - Pinned bottom section.
 */
export function RuiSidebarFooter({ children, class: className, ...props }: RuiSidebarFooterProps) {
	return (
		<div {...props} class={cx('rui-sidebar__footer', className)}>
			{children}
		</div>
	);
}

export type RuiSidebarSeparatorProps = JsxElementProps<HTMLHRElement>;

/**
 * Horizontal rule between sidebar sections.
 *
 * @cssclass rui-sidebar__separator - Horizontal rule (`role="separator"`).
 */
export function RuiSidebarSeparator({ class: className, ...props }: RuiSidebarSeparatorProps) {
	return (
		<hr {...props} role="separator" aria-orientation="horizontal" class={cx('rui-sidebar__separator', className)} />
	);
}

export type RuiSidebarGroupProps = JsxElementProps<HTMLElement>;

/**
 * Landmark group of related sidebar items.
 *
 * @cssclass rui-sidebar__group - Landmark group region.
 */
export function RuiSidebarGroup({ children, class: className, ...props }: RuiSidebarGroupProps) {
	return (
		<section {...props} class={cx('rui-sidebar__group', className)}>
			{children}
		</section>
	);
}

export type RuiSidebarGroupLabelProps = JsxElementProps<HTMLHeadingElement>;

/**
 * Heading for a sidebar group.
 *
 * @cssclass rui-sidebar__group-label - Group heading (`<h2>`).
 */
export function RuiSidebarGroupLabel({ children, class: className, ...props }: RuiSidebarGroupLabelProps) {
	return (
		<h2 {...props} class={cx('rui-sidebar__group-label', className)}>
			{children}
		</h2>
	);
}

export type RuiSidebarGroupActionProps = JsxElementProps<HTMLButtonElement>;

/**
 * Top-right action button inside a group header.
 *
 * @cssclass rui-sidebar__group-action - Group header action button.
 */
export function RuiSidebarGroupAction({ children, class: className, ...props }: RuiSidebarGroupActionProps) {
	return (
		<button {...props} type="button" class={cx('rui-sidebar__group-action', className)}>
			{children}
		</button>
	);
}

export type RuiSidebarGroupHeaderProps = JsxElementProps<HTMLDivElement> & {
	label: JsxRenderable;
	action?: JsxRenderable;
};

/**
 * Convenience: a label + optional action in one row.
 *
 * @cssclass rui-sidebar__group-header - Group label + action row.
 */
export function RuiSidebarGroupHeader({ label, action, class: className, ...props }: RuiSidebarGroupHeaderProps) {
	return (
		<div {...props} class={cx('rui-sidebar__group-header', className)}>
			<RuiSidebarGroupLabel>{label}</RuiSidebarGroupLabel>
			{action}
		</div>
	);
}

export type RuiSidebarMenuProps = JsxElementProps<HTMLUListElement>;

/**
 * `<ul>` of sidebar items.
 *
 * @cssclass rui-sidebar__menu - Menu list.
 */
export function RuiSidebarMenu({ children, class: className, ...props }: RuiSidebarMenuProps) {
	return (
		<ul {...props} role="list" class={cx('rui-sidebar__menu', className)}>
			{children}
		</ul>
	);
}

export type RuiSidebarMenuItemProps = JsxElementProps<HTMLLIElement>;

/**
 * `<li>` of a sidebar menu.
 *
 * @cssclass rui-sidebar__menu-item - Menu item (`<li>`).
 */
export function RuiSidebarMenuItem({ children, class: className, ...props }: RuiSidebarMenuItemProps) {
	return (
		<li {...props} class={cx('rui-sidebar__menu-item', className)}>
			{children}
		</li>
	);
}

type RuiSidebarMenuButtonChrome = {
	/** Mark this button as the current page. */
	isActive?: boolean;
	/** Optional tooltip label for collapsed-icon mode. */
	tooltip?: string;
};

export type RuiSidebarMenuButtonControlProps = JsxElementProps<HTMLButtonElement> &
	RuiSidebarMenuButtonChrome & {
		as?: 'button';
		href?: never;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		/** Click handler for `button` mode. Prefer `on:click` on the host. */
		onClick?: (event: Event) => void;
	};

export type RuiSidebarMenuButtonLinkProps = JsxElementProps<HTMLAnchorElement> &
	RuiSidebarMenuButtonChrome & {
		as?: 'a';
		href: string;
	};

export type RuiSidebarMenuButtonProps = RuiSidebarMenuButtonControlProps | RuiSidebarMenuButtonLinkProps;

/**
 * The clickable surface inside a `RuiSidebarMenuItem`. When the sidebar
 * collapses to icon mode, only this element remains visible; it must keep an
 * accessible name via `tooltip` or visible children.
 *
 * Stamps `[data-ref="menu-button"]`.
 *
 * @cssclass rui-sidebar__menu-button - Clickable menu surface (`<a>`/`<button>`).
 * @cssclass rui-sidebar__menu-button--active - Current-page marker (`aria-current="page"`).
 */
export function RuiSidebarMenuButton(props: RuiSidebarMenuButtonProps) {
	if (props.href !== undefined) {
		const {
			children,
			class: className,
			isActive,
			href,
			tooltip,
			aria,
			title,
			'aria-current': ariaCurrent,
			...host
		} = props;

		return (
			<a
				{...omitProps(host, 'as')}
				aria={withDefaultAriaLabel(aria, typeof children === 'string' ? undefined : tooltip)}
				href={href}
				data-ref="menu-button"
				class={cx('rui-sidebar__menu-button', isActive && 'rui-sidebar__menu-button--active', className)}
				aria-current={isActive ? 'page' : ariaCurrent}
				title={coalesceDefined(title, tooltip)}
			>
				{children}
			</a>
		);
	}

	const {
		children,
		class: className,
		isActive,
		type = 'button',
		tooltip,
		disabled,
		onClick,
		aria,
		title,
		'aria-current': ariaCurrent,
		'on:click': onHostClick,
		...host
	} = props;

	return (
		<button
			{...omitProps(host, 'as', 'href')}
			aria={withDefaultAriaLabel(aria, typeof children === 'string' ? undefined : tooltip)}
			type={type}
			data-ref="menu-button"
			class={cx('rui-sidebar__menu-button', isActive && 'rui-sidebar__menu-button--active', className)}
			aria-current={isActive ? 'page' : ariaCurrent}
			disabled={disabled}
			title={coalesceDefined(title, tooltip)}
			on:click={coalesceDefined(onHostClick, onClick)}
		>
			{children}
		</button>
	);
}

export type RuiSidebarMenuActionProps = RuiSidebarMenuButtonProps;

/** Smaller, secondary button (e.g. `+ New`) below a menu or group.
 * @cssclass rui-sidebar__menu-action - Secondary menu action button. */
export function RuiSidebarMenuAction(props: RuiSidebarMenuActionProps) {
	const { class: className, ...rest } = props;
	return <RuiSidebarMenuButton class={cx('rui-sidebar__menu-action', className)} {...rest} />;
}

export type RuiSidebarInsetProps = JsxElementProps<HTMLElement>;

/**
 * The main content area that sits next to the sidebar.
 *
 * @cssclass rui-sidebar__inset - Main content area (`<main>`).
 */
export function RuiSidebarInset({ children, class: className, ...props }: RuiSidebarInsetProps) {
	return (
		<main {...props} class={cx('rui-sidebar__inset', className)}>
			{children}
		</main>
	);
}

export type RuiSidebarViewProps = JsxCustomElementAttributes<RuiSidebarElement, RuiSidebarProps & { id: string }>;

/**
 * Sidebar view. Stamps `[data-ref="root"]`, `[data-ref="pane"]`, optional
 * `[data-ref="scrim"]` and `[data-ref="handle"]`.
 *
 * @cssclass rui-sidebar - Pane surface.
 */
export function RuiSidebar({ children, open, label, ...props }: RuiSidebarViewProps) {
	return (
		<rui-sidebar {...props} prop:open={open} label={label}>
			<div class="rui-sidebar" data-ref="root">
				<button
					data-ref="scrim"
					type="button"
					class="rui-sidebar__scrim"
					tabindex={-1}
					aria-label="Close sidebar"
					hidden
				></button>
				<div data-ref="pane" class="rui-sidebar__pane" aria-label={label}>
					{children}
				</div>
				<div data-ref="handle" class="rui-sidebar__handle" role="separator" tabindex={0} hidden>
					<span class="rui-sidebar__handle-grip" aria-hidden="true"></span>
				</div>
			</div>
		</rui-sidebar>
	);
}

export type RuiSidebarTriggerViewProps = JsxCustomElementAttributes<RuiSidebarTriggerElement, RuiSidebarTriggerProps>;

function RuiSidebarTriggerIcon() {
	return (
		<span class="rui-sidebar__trigger-icon" aria-hidden="true">
			<svg
				class="rui-sidebar__trigger-glyph rui-sidebar__trigger-glyph--collapse"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
				<path d="M9 3v18" />
				<path d="m14 15 3-3-3-3" />
			</svg>
			<svg
				class="rui-sidebar__trigger-glyph rui-sidebar__trigger-glyph--expand"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
				<path d="M9 3v18" />
				<path d="m14 9-3 3 3 3" />
			</svg>
			<svg
				class="rui-sidebar__trigger-glyph rui-sidebar__trigger-glyph--close"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M18 6 6 18" />
				<path d="m6 6 12 12" />
			</svg>
			<svg
				class="rui-sidebar__trigger-glyph rui-sidebar__trigger-glyph--menu"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M4 6h16" />
				<path d="M4 12h16" />
				<path d="M4 18h16" />
			</svg>
		</span>
	);
}

/**
 * Sidebar toggle button view. Stamps `[data-ref="button"]` inside `rui-sidebar-trigger`.
 */
export function RuiSidebarTrigger({
	children,
	class: className,
	triggerLabel,
	placement,
	variant = 'ghost',
	size = 'md',
	...props
}: RuiSidebarTriggerViewProps) {
	const buttonLabel = triggerLabel ?? 'Toggle sidebar';

	return (
		<rui-sidebar-trigger
			{...props}
			class={cx(className, placement && `rui-sidebar-trigger-placement--${placement}`)}
			prop:buttonLabel={buttonLabel}
			data={{ buttonLabel }}
			placement={placement}
			variant={variant}
			size={size}
		>
			<button
				data-ref="button"
				type="button"
				class={cx('rui-button', `rui-button--${variant}`, `rui-button--${size}`, 'rui-sidebar__trigger')}
			>
				{children ?? <RuiSidebarTriggerIcon />}
			</button>
		</rui-sidebar-trigger>
	);
}
