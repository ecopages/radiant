import { RadiantElement, customElement, prop } from '@ecopages/radiant';

export type RuiBreadcrumbProps = {
	/** Accessible name for the navigation landmark. Default: `Breadcrumb`. */
	label?: string;
	/**
	 * Glyph used by empty `RuiBreadcrumbSeparator` nodes (via CSS custom
	 * property). Default: `/`. Override per-separator with children instead
	 * of reaching for context.
	 */
	separator?: string;
};

/**
 * `<rui-breadcrumb>` — a trail of links to ancestor pages in hierarchical order.
 *
 * Implements the WAI-ARIA APG Breadcrumb pattern: a `<nav>` landmark containing
 * an ordered list of links, with `aria-current="page"` on the current page item.
 *
 * Compose with the JSX helpers (`RuiBreadcrumbList`, `RuiBreadcrumbItem`,
 * `RuiBreadcrumbLink`, `RuiBreadcrumbPage`, `RuiBreadcrumbSeparator`,
 * `RuiBreadcrumbEllipsis`).
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/
 *
 * Keyboard interaction: standard link navigation (`Tab`, `Enter`).
 *
 * @element rui-breadcrumb
 */
@customElement('rui-breadcrumb')
export class RuiBreadcrumb extends RadiantElement {
	@prop({ type: String, defaultValue: 'Breadcrumb' }) label: string;
	@prop({ type: String, defaultValue: '/' }) separator: string;
}
