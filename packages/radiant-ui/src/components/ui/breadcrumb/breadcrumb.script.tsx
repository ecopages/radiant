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
 * `<rui-breadcrumb>` — navigation landmark for a hierarchical page trail.
 *
 * The custom element holds `label` and `separator` props; it does not query
 * authored children. Use `RuiBreadcrumb` and the breadcrumb helpers, which stamp
 * the `<nav>` landmark and list structure.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/
 * @element rui-breadcrumb
 * @attr {string} label - Accessible name for the navigation landmark. Default: `Breadcrumb`.
 * @attr {string} separator - Glyph for empty `RuiBreadcrumbSeparator` nodes (CSS custom property). Default: `/`.
 *
 * @remarks
 * No light-DOM query contract — keyboard interaction is standard link navigation.
 * BEM classes live on the view helpers.
 */
@customElement('rui-breadcrumb')
export class RuiBreadcrumb extends RadiantElement {
	@prop({ type: String, defaultValue: 'Breadcrumb' }) label: string;
	@prop({ type: String, defaultValue: '/' }) separator: string;
}
