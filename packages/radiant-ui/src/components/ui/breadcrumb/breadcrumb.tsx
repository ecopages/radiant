import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps } from '@/types';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiBreadcrumbProps } from './breadcrumb.script';
import { RuiBreadcrumb as RuiBreadcrumbElement } from './breadcrumb.script';

function cx(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(' ');
}

export type RuiBreadcrumbViewProps = RuiBreadcrumbProps &
	RadiantSlotProps & {
		children?: JsxRenderable;
		class?: string;
	};

/**
 * Landmark wrapper for a breadcrumb trail. Set `separator` once here (e.g. `/`
 * or `>`); empty `RuiBreadcrumbSeparator` nodes pick it up via CSS — no context.
 * Pass children into a separator to override for that instance.
 */
export const RuiBreadcrumb = defineRadiantView(
	RuiBreadcrumbElement,
	({ slot, label, separator, class: className, children }: RuiBreadcrumbViewProps) => (
		<rui-breadcrumb slot={slot} class={className} label={label} separator={separator}>
			{children}
		</rui-breadcrumb>
	),

	{ stylesheets: ['./breadcrumb.css'] },
);

export type RuiBreadcrumbListProps = {
	children: JsxRenderable;
	class?: string;
};

/** Ordered list of breadcrumb items and separators. */
export function RuiBreadcrumbList({ children, class: className }: RuiBreadcrumbListProps) {
	return <ol class={cx('rui-breadcrumb__list', className)}>{children}</ol>;
}

export type RuiBreadcrumbItemProps = {
	children: JsxRenderable;
	class?: string;
};

/** Single crumb (`<li>`). */
export function RuiBreadcrumbItem({ children, class: className }: RuiBreadcrumbItemProps) {
	return <li class={cx('rui-breadcrumb__item', className)}>{children}</li>;
}

export type RuiBreadcrumbLinkProps = {
	href: string;
	children: JsxRenderable;
	class?: string;
	/** Accessible name when the link content is non-text (e.g. an icon). */
	'aria-label'?: string;
};

/** Linked ancestor page. */
export function RuiBreadcrumbLink({
	href,
	children,
	class: className,
	'aria-label': ariaLabel,
}: RuiBreadcrumbLinkProps) {
	return (
		<a class={cx('rui-breadcrumb__link', className)} href={href} aria-label={ariaLabel}>
			{children}
		</a>
	);
}

export type RuiBreadcrumbPageProps = {
	children: JsxRenderable;
	class?: string;
};

/** Current page (non-link). */
export function RuiBreadcrumbPage({ children, class: className }: RuiBreadcrumbPageProps) {
	return (
		<span class={cx('rui-breadcrumb__page', className)} aria-current="page">
			{children}
		</span>
	);
}

export type RuiBreadcrumbSeparatorProps = {
	/** Override the trail separator for this instance only. */
	children?: JsxRenderable;
	class?: string;
};

/**
 * Visual separator between crumbs. Renders as a presentational list item.
 * With no children, uses the glyph from `RuiBreadcrumb`’s `separator` prop
 * (CSS custom property). With children, those replace the default glyph.
 */
export function RuiBreadcrumbSeparator({ children, class: className }: RuiBreadcrumbSeparatorProps) {
	return (
		<li class={cx('rui-breadcrumb__separator', className)} role="presentation" aria-hidden="true">
			{children}
		</li>
	);
}

export type RuiBreadcrumbEllipsisProps = {
	class?: string;
	/** Accessible label announced for the collapsed segment. Default: `More`. */
	label?: string;
};

/** Collapsed middle segment indicator. */
export function RuiBreadcrumbEllipsis({ class: className, label = 'More' }: RuiBreadcrumbEllipsisProps) {
	return (
		<span class={cx('rui-breadcrumb__ellipsis', className)} role="presentation" aria-hidden="true">
			<span aria-hidden="true">…</span>
			<span class="rui-breadcrumb__ellipsis-label">{label}</span>
		</span>
	);
}
