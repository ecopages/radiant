import type { JsxRenderable } from '@ecopages/jsx';
import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { prop } from '@ecopages/radiant/decorators/prop';

export type RuiBreadcrumbProps = {
	/** Accessible name for the navigation landmark. Default: `Breadcrumb`. */
	label?: string;
};

export type RuiBreadcrumbItem = {
	href?: string;
	label: JsxRenderable;
	/** Marks the current page. Only one item should be current. */
	current?: boolean;
};

/**
 * `<rui-breadcrumb>` — a trail of links to ancestor pages in hierarchical order.
 *
 * Implements the WAI-ARIA APG Breadcrumb pattern: a `<nav>` landmark containing
 * an ordered list of links, with `aria-current="page"` on the current page item.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/breadcrumb/
 *
 * Keyboard interaction: standard link navigation (`Tab`, `Enter`).
 *
 * @element rui-breadcrumb
 * @slot - Authored breadcrumb list markup, or use the JSX view helper with `items`.
 */
@customElement('rui-breadcrumb')
export class RuiBreadcrumb extends RadiantElement {
	@prop({ type: String, defaultValue: 'Breadcrumb' }) label: string;

	override render() {
		return (
			<nav class="rui-breadcrumb" aria-label={this.label || 'Breadcrumb'}>
				<slot></slot>
			</nav>
		);
	}
}
