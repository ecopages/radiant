import type { JsxHtmlProps, JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiBreadcrumbProps } from './breadcrumb.script';
import { RuiBreadcrumb as RuiBreadcrumbElement } from './breadcrumb.script';

export type RuiBreadcrumbViewProps = JsxHtmlPropsWithChildren<RuiBreadcrumbProps & { slot?: string }>;

/**
 * Landmark wrapper for a breadcrumb trail. Set `separator` once here (e.g. `/`
 * or `>`); empty `RuiBreadcrumbSeparator` nodes pick it up via CSS — no context.
 * Pass children into a separator to override for that instance.
 */
export const RuiBreadcrumb = defineRadiantView(
	RuiBreadcrumbElement,
	({ children, ...props }: RuiBreadcrumbViewProps) => <rui-breadcrumb {...props}>{children}</rui-breadcrumb>,
	{ stylesheets: ['./breadcrumb.css'] },
);

export type RuiBreadcrumbListProps = JsxHtmlPropsWithChildren;

/** Ordered list of breadcrumb items and separators. */
export function RuiBreadcrumbList({ children, class: className, ...props }: RuiBreadcrumbListProps) {
	return (
		<ol {...props} class={cx('rui-breadcrumb__list', className)}>
			{children}
		</ol>
	);
}

export type RuiBreadcrumbItemProps = JsxHtmlPropsWithChildren;

/** Single crumb (`<li>`). */
export function RuiBreadcrumbItem({ children, class: className, ...props }: RuiBreadcrumbItemProps) {
	return (
		<li {...props} class={cx('rui-breadcrumb__item', className)}>
			{children}
		</li>
	);
}

export type RuiBreadcrumbLinkProps = JsxHtmlPropsWithChildren<{
	href: string;
	/** Accessible name when the link content is non-text (e.g. an icon). */
	'aria-label'?: string;
}>;

/** Linked ancestor page. */
export function RuiBreadcrumbLink({
	children,
	href,
	class: className,
	'aria-label': ariaLabel,
	...props
}: RuiBreadcrumbLinkProps) {
	return (
		<a {...props} class={cx('rui-breadcrumb__link', className)} href={href} aria-label={ariaLabel}>
			{children}
		</a>
	);
}

export type RuiBreadcrumbPageProps = JsxHtmlPropsWithChildren;

/** Current page (non-link). */
export function RuiBreadcrumbPage({ children, class: className, ...props }: RuiBreadcrumbPageProps) {
	return (
		<span {...props} class={cx('rui-breadcrumb__page', className)} aria-current="page">
			{children}
		</span>
	);
}

export type RuiBreadcrumbSeparatorProps = JsxHtmlPropsWithChildren;

/**
 * Visual separator between crumbs. Renders as a presentational list item.
 * With no children, uses the glyph from `RuiBreadcrumb`’s `separator` prop
 * (CSS custom property). With children, those replace the default glyph.
 */
export function RuiBreadcrumbSeparator({ children, class: className, ...props }: RuiBreadcrumbSeparatorProps) {
	return (
		<li {...props} class={cx('rui-breadcrumb__separator', className)} role="presentation" aria-hidden="true">
			{children}
		</li>
	);
}

export type RuiBreadcrumbEllipsisProps = JsxHtmlProps<{
	/** Accessible label announced for the collapsed segment. Default: `More`. */
	label?: string;
}>;

/** Collapsed middle segment indicator. */
export function RuiBreadcrumbEllipsis({ label = 'More', class: className, ...props }: RuiBreadcrumbEllipsisProps) {
	return (
		<span {...props} class={cx('rui-breadcrumb__ellipsis', className)} role="presentation" aria-hidden="true">
			<span aria-hidden="true">…</span>
			<span class="rui-breadcrumb__ellipsis-label">{label}</span>
		</span>
	);
}
