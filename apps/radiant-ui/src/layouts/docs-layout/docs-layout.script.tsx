import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';

/**
 * Docs layout owns sidebar / TOC markup from SSR. View imports alone
 * do not register the custom elements in the client bundle.
 */
import '@ecopages/radiant-ui/breadcrumb';
import '@ecopages/radiant-ui/sidebar';
import '@ecopages/radiant-ui/toc';
import { flattenDocsNav, getAdjacentDocsNavItems } from '@/lib/component-nav';

const DOCS_NAV_ITEMS = flattenDocsNav();

/**
 * Previous / Next pagination from the ordered docs nav (not scraped markup).
 */
@customElement('radiant-docs-pagination')
export class RadiantDocsPagination extends RadiantElement {
	@onEvent({ document: true, type: 'eco:page-load' })
	onPageLoad(): void {
		this.requestUpdate();
	}

	@onEvent({ document: true, type: 'eco:after-swap' })
	onAfterSwap(): void {
		this.requestUpdate();
	}

	override render() {
		const adjacent = getAdjacentDocsNavItems(window.location.pathname, DOCS_NAV_ITEMS);
		if (!adjacent) {
			return null;
		}

		const { prev, next } = adjacent;

		return (
			<>
				{prev ? (
					<a href={prev.href} class="group prev" aria-label={prev.title}>
						<span class="pagination-label" aria-hidden="true">
							Previous
						</span>
						<span class="pagination-title">{prev.title}</span>
					</a>
				) : (
					<div></div>
				)}
				{next ? (
					<a href={next.href} class="group next" aria-label={next.title}>
						<span class="pagination-label" aria-hidden="true">
							Next
						</span>
						<span class="pagination-title">{next.title}</span>
					</a>
				) : null}
			</>
		);
	}
}

declare module '@ecopages/jsx' {
	interface JsxCustomIntrinsicElements {
		'radiant-docs-pagination': JsxCustomElementAttributes<RadiantDocsPagination>;
	}
}
