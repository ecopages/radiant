import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';

/**
 * Docs layout owns sidebar / TOC / breadcrumb markup from SSR. View imports alone
 * do not register the custom elements in the client bundle.
 */
import '@ecopages/radiant-ui/alert';
import '@ecopages/radiant-ui/breadcrumb';
import '@ecopages/radiant-ui/sidebar';
import '@ecopages/radiant-ui/toc';
import { docsNav, flattenContentNav, getAdjacentContentNavItems } from '@/lib/content-nav';

const DOCS_NAV_ITEMS = flattenContentNav(docsNav);

/**
 * Previous / Next pagination from the ordered docs content nav (not scraped markup).
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
		const adjacent = getAdjacentContentNavItems(DOCS_NAV_ITEMS, window.location.pathname);
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

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'radiant-docs-pagination': JsxCustomElementAttributes<RadiantDocsPagination>;
	}
}
