import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiBreadcrumb as RuiBreadcrumbElement, RuiBreadcrumbProps } from './breadcrumb.script';
import './breadcrumb.script';

export type RuiBreadcrumbViewProps = JsxCustomElementAttributes<RuiBreadcrumbElement, RuiBreadcrumbProps>;

/**
 * Landmark wrapper for a breadcrumb trail. Stamps `<nav class="rui-breadcrumb">`.
 *
 * @cssclass rui-breadcrumb - `<nav>` landmark root.
 *
 * @remarks `separator` sets `--rui-breadcrumb-separator` for empty separators.
 */
export function RuiBreadcrumb({ children, label, separator, ...props }: RuiBreadcrumbViewProps) {
	const resolvedLabel = label || 'Breadcrumb';
	const resolvedSeparator = separator || '/';
	return (
		<rui-breadcrumb {...props} label={label} separator={separator}>
			<nav
				class="rui-breadcrumb"
				aria-label={resolvedLabel}
				style={{ '--rui-breadcrumb-separator': JSON.stringify(resolvedSeparator) }}
			>
				{children}
			</nav>
		</rui-breadcrumb>
	);
}

export type RuiBreadcrumbListProps = JsxElementProps<HTMLOListElement>;

/**
 * Ordered list of breadcrumb items and separators. Stamps `<ol class="rui-breadcrumb__list">`.
 *
 * @cssclass rui-breadcrumb__list - Ordered list row.
 */
export function RuiBreadcrumbList({ children, class: className, ...props }: RuiBreadcrumbListProps) {
	return (
		<ol {...props} class={cx('rui-breadcrumb__list', className)}>
			{children}
		</ol>
	);
}

export type RuiBreadcrumbItemProps = JsxElementProps<HTMLLIElement>;

/**
 * Single crumb list item. Stamps `<li class="rui-breadcrumb__item">`.
 *
 * @cssclass rui-breadcrumb__item - List item wrapping a crumb link/page.
 */
export function RuiBreadcrumbItem({ children, class: className, ...props }: RuiBreadcrumbItemProps) {
	return (
		<li {...props} class={cx('rui-breadcrumb__item', className)}>
			{children}
		</li>
	);
}

export type RuiBreadcrumbLinkProps = JsxElementProps<HTMLAnchorElement> & {
	href: string;
};

/**
 * Linked ancestor page. Stamps `<a class="rui-breadcrumb__link">`.
 *
 * @cssclass rui-breadcrumb__link - Crumb link.
 */
export function RuiBreadcrumbLink({ children, href, class: className, ...props }: RuiBreadcrumbLinkProps) {
	return (
		<a {...props} class={cx('rui-breadcrumb__link', className)} href={href}>
			{children}
		</a>
	);
}

export type RuiBreadcrumbPageProps = JsxElementProps<HTMLSpanElement>;

/**
 * Current page (non-link). Stamps `<span class="rui-breadcrumb__page" aria-current="page">`.
 *
 * @cssclass rui-breadcrumb__page - Current page span (`aria-current="page"`).
 */
export function RuiBreadcrumbPage({ children, class: className, ...props }: RuiBreadcrumbPageProps) {
	return (
		<span {...props} class={cx('rui-breadcrumb__page', className)} aria-current="page">
			{children}
		</span>
	);
}

export type RuiBreadcrumbSeparatorProps = JsxElementProps<HTMLLIElement>;

/**
 * Visual separator between crumbs. Stamps presentational `<li class="rui-breadcrumb__separator">`.
 *
 * @cssclass rui-breadcrumb__separator - Presentational separator (`aria-hidden`).
 *
 * @remarks With no children, uses the glyph from `RuiBreadcrumb`'s `separator` prop.
 */
export function RuiBreadcrumbSeparator({ children, class: className, ...props }: RuiBreadcrumbSeparatorProps) {
	return (
		<li {...props} class={cx('rui-breadcrumb__separator', className)} role="presentation" aria-hidden="true">
			{children}
		</li>
	);
}

export type RuiBreadcrumbEllipsisProps = JsxElementProps<HTMLSpanElement> & {
	/** Accessible label announced for the collapsed segment. Default: `More`. */
	label?: string;
};

/**
 * Collapsed middle segment indicator. Stamps `<span class="rui-breadcrumb__ellipsis">`.
 *
 * @cssclass rui-breadcrumb__ellipsis - Collapsed segment indicator (`aria-hidden`).
 * @cssclass rui-breadcrumb__ellipsis-label - Screen-reader label for the collapsed segment.
 */
export function RuiBreadcrumbEllipsis({ label = 'More', class: className, ...props }: RuiBreadcrumbEllipsisProps) {
	return (
		<span {...props} class={cx('rui-breadcrumb__ellipsis', className)} role="presentation" aria-hidden="true">
			<span aria-hidden="true">…</span>
			<span class="rui-breadcrumb__ellipsis-label">{label}</span>
		</span>
	);
}
