import type { JsxHtmlPropsWithChildren, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiSidebarProps } from './sidebar.script';
import './sidebar.script';

import type { RuiSidebarTriggerProps } from './sidebar-trigger.script';
import './sidebar-trigger.script';

export type RuiSidebarProviderProps = {
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
	/** Extra class names. */
	class?: string;
};

/**
 * `<div>` shell that wraps the sidebar and the main inset. Reflects
 * `data-layout` so stylesheets can adapt. Plays the role of
 * `SidebarProvider` from common sidebar kits, but without a runtime context —
 * coordination between trigger, sidebar, and inset is achieved through
 * `id`/`aria-controls` and shared `data-*` attributes.
 */
export function RuiSidebarProvider({
	layout = 'default',
	siteHeader,
	sidebar,
	children,
	class: className,
}: RuiSidebarProviderProps) {
	if (layout === 'docs') {
		return (
			<div class={cx('rui-sidebar-provider', className)} data-layout={layout}>
				{siteHeader ? <div class="rui-sidebar-provider__site-header">{siteHeader}</div> : null}
				<div class="rui-sidebar-provider__body">
					{sidebar}
					{children}
				</div>
			</div>
		);
	}

	return (
		<div class={cx('rui-sidebar-provider', className)} data-layout={layout}>
			{sidebar}
			{children}
		</div>
	);
}

export type RuiSidebarHeaderProps = {
	children: JsxRenderable;
	class?: string;
	/** Accessible name for the header region. */
	'aria-label'?: string;
};

/** Top section of the sidebar pane (logo, search, primary trigger). */
export function RuiSidebarHeader({ children, class: className, 'aria-label': ariaLabel }: RuiSidebarHeaderProps) {
	return (
		<div class={cx('rui-sidebar__header', className)} aria-label={ariaLabel}>
			{children}
		</div>
	);
}

export type RuiSidebarContentProps = {
	children: JsxRenderable;
	class?: string;
	/** Optional label for the scrolling content region. */
	'aria-label'?: string;
};

/** Scrollable middle section. Multiple allowed; each becomes its own region. */
export function RuiSidebarContent({ children, class: className, 'aria-label': ariaLabel }: RuiSidebarContentProps) {
	return (
		<div class={cx('rui-sidebar__content', className)} aria-label={ariaLabel}>
			{children}
		</div>
	);
}

export type RuiSidebarFooterProps = {
	children: JsxRenderable;
	class?: string;
};

/** Pinned bottom section (user, theme toggle, settings). */
export function RuiSidebarFooter({ children, class: className }: RuiSidebarFooterProps) {
	return <div class={cx('rui-sidebar__footer', className)}>{children}</div>;
}

export type RuiSidebarSeparatorProps = {
	class?: string;
	/** Accessible label for the separator. */
	'aria-label'?: string;
};

/** Horizontal rule between sidebar sections. */
export function RuiSidebarSeparator({ class: className, 'aria-label': ariaLabel }: RuiSidebarSeparatorProps) {
	return (
		<hr
			role="separator"
			aria-orientation="horizontal"
			aria-label={ariaLabel}
			class={cx('rui-sidebar__separator', className)}
		/>
	);
}

export type RuiSidebarGroupProps = {
	children: JsxRenderable;
	class?: string;
	/** Accessible label for the group region. */
	'aria-label'?: string;
};

/** Landmark group of related sidebar items. */
export function RuiSidebarGroup({ children, class: className, 'aria-label': ariaLabel }: RuiSidebarGroupProps) {
	return (
		<section class={cx('rui-sidebar__group', className)} aria-label={ariaLabel}>
			{children}
		</section>
	);
}

export type RuiSidebarGroupLabelProps = {
	children: JsxRenderable;
	class?: string;
	/** Optional `id` so the group can be referenced by `aria-labelledby`. */
	id?: string;
};

/** Heading for a sidebar group. */
export function RuiSidebarGroupLabel({ children, class: className, id }: RuiSidebarGroupLabelProps) {
	return (
		<h2 id={id} class={cx('rui-sidebar__group-label', className)}>
			{children}
		</h2>
	);
}

export type RuiSidebarGroupActionProps = {
	children: JsxRenderable;
	class?: string;
	/** Accessible label for the action button. */
	'aria-label'?: string;
};

/** Top-right action button inside a group header. */
export function RuiSidebarGroupAction({
	children,
	class: className,
	'aria-label': ariaLabel,
}: RuiSidebarGroupActionProps) {
	return (
		<button type="button" aria-label={ariaLabel} class={cx('rui-sidebar__group-action', className)}>
			{children}
		</button>
	);
}

export type RuiSidebarGroupHeaderProps = {
	label: JsxRenderable;
	action?: JsxRenderable;
	class?: string;
};

/** Convenience: a label + optional action in one row. */
export function RuiSidebarGroupHeader({ label, action, class: className }: RuiSidebarGroupHeaderProps) {
	return (
		<div class={cx('rui-sidebar__group-header', className)}>
			<RuiSidebarGroupLabel>{label}</RuiSidebarGroupLabel>
			{action}
		</div>
	);
}

export type RuiSidebarMenuProps = {
	children: JsxRenderable;
	class?: string;
	/** Accessible label for the menu list. */
	'aria-label'?: string;
};

/** `<ul>` of sidebar items. */
export function RuiSidebarMenu({ children, class: className, 'aria-label': ariaLabel }: RuiSidebarMenuProps) {
	return (
		<ul role="list" class={cx('rui-sidebar__menu', className)} aria-label={ariaLabel}>
			{children}
		</ul>
	);
}

export type RuiSidebarMenuItemProps = {
	children: JsxRenderable;
	class?: string;
};

/** `<li>` of a sidebar menu. */
export function RuiSidebarMenuItem({ children, class: className }: RuiSidebarMenuItemProps) {
	return <li class={cx('rui-sidebar__menu-item', className)}>{children}</li>;
}

export type RuiSidebarMenuButtonProps = {
	children: JsxRenderable;
	class?: string;
	/** Mark this button as the current page. */
	isActive?: boolean;
	/** Render as a different element via the `as` prop. Default: `a` when `href` is set, else `button`. */
	as?: 'a' | 'button';
	/** Forwarded to anchor or button. */
	href?: string;
	type?: 'button' | 'submit' | 'reset';
	/** Optional tooltip label for collapsed-icon mode. */
	tooltip?: string;
	disabled?: boolean;
	/** Click handler for `button` mode. */
	onClick?: (event: Event) => void;
};

/**
 * The clickable surface inside a `RuiSidebarMenuItem`. When the sidebar
 * collapses to icon mode, only this element remains visible; it must keep an
 * accessible name via `tooltip` or visible children.
 */
export function RuiSidebarMenuButton({
	children,
	class: className,
	isActive,
	as,
	href,
	type = 'button',
	tooltip,
	disabled,
	onClick,
}: RuiSidebarMenuButtonProps) {
	const classNames = cx('rui-sidebar__menu-button', isActive && 'rui-sidebar__menu-button--active', className);
	const title = tooltip;
	const ariaLabel = typeof children === 'string' ? undefined : tooltip;

	if (as === 'button' || (!as && !href)) {
		return (
			<button
				type={type}
				class={classNames}
				aria-current={isActive ? 'page' : undefined}
				disabled={disabled}
				title={title}
				aria-label={ariaLabel}
				on:click={onClick}
			>
				{children}
			</button>
		);
	}

	return (
		<a
			href={href}
			class={classNames}
			aria-current={isActive ? 'page' : undefined}
			title={title}
			aria-label={ariaLabel}
		>
			{children}
		</a>
	);
}

export type RuiSidebarMenuActionProps = RuiSidebarMenuButtonProps;

/** Smaller, secondary button (e.g. `+ New`) below a menu or group. */
export function RuiSidebarMenuAction(props: RuiSidebarMenuActionProps) {
	const { class: className, ...rest } = props;
	return <RuiSidebarMenuButton class={cx('rui-sidebar__menu-action', className)} {...rest} />;
}

export type RuiSidebarInsetProps = {
	children: JsxRenderable;
	class?: string;
	/** Optional `id` so the sidebar trigger can target the main landmark. */
	id?: string;
};

/** The main content area that sits next to the sidebar. */
export function RuiSidebarInset({ children, class: className, id }: RuiSidebarInsetProps) {
	return (
		<main id={id} class={cx('rui-sidebar__inset', className)}>
			{children}
		</main>
	);
}

export type RuiSidebarViewProps = JsxHtmlPropsWithChildren<
	RuiSidebarProps & {
		id: string;
		slot?: string;
	}
>;

export function RuiSidebar({
	children,
	id,
	defaultOpen,
	mobileDefaultOpen,
	open,
	defaultWidth,
	width,
	resizable,
	mobileBreakpoint,
	matchActive,
	matchMode,
	scrollActiveOnMount,
	navigationEvents,
	...props
}: RuiSidebarViewProps) {
	return (
		<rui-sidebar
			{...props}
			id={id}
			prop:defaultOpen={defaultOpen}
			prop:mobileDefaultOpen={mobileDefaultOpen}
			prop:open={open}
			prop:defaultWidth={defaultWidth}
			prop:width={width}
			prop:resizable={resizable}
			prop:mobileBreakpoint={mobileBreakpoint}
			prop:matchActive={matchActive}
			prop:matchMode={matchMode}
			prop:scrollActiveOnMount={scrollActiveOnMount}
			prop:navigationEvents={navigationEvents}
		>
			{children}
		</rui-sidebar>
	);
}

export type RuiSidebarTriggerViewProps = JsxHtmlPropsWithChildren<
	RuiSidebarTriggerProps & {
		slot?: string;
	}
>;

export function RuiSidebarTrigger({
	children,
	class: className,
	controls,
	triggerLabel,
	placement,
	variant,
	size,
	...props
}: RuiSidebarTriggerViewProps) {
	return (
		<rui-sidebar-trigger
			{...props}
			class={cx(className, placement && `rui-sidebar-trigger-placement--${placement}`)}
			prop:controls={controls}
			prop:buttonLabel={triggerLabel ?? 'Toggle sidebar'}
			attr:data-button-label={triggerLabel ?? 'Toggle sidebar'}
			prop:placement={placement}
			variant={variant}
			size={size}
		>
			{children}
		</rui-sidebar-trigger>
	);
}
