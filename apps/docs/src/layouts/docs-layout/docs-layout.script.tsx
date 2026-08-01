import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';

const SIDEBAR_NAV_LINK_SELECTOR =
	'rui-sidebar-menu[match-active] a.rui-sidebar__menu-button, rui-sidebar-menu[match-active] a[href]';

/**
 * Previous / Next pagination element that renders navigation links from the
 * ordered list of sidebar menu links with `match-active` enabled.
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

	private getPaginationLinks() {
		const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(SIDEBAR_NAV_LINK_SELECTOR));
		if (links.length === 0) {
			return null;
		}

		const currentPath = window.location.pathname;
		const currentIndex = links.findIndex((link) => link.pathname === currentPath);

		if (currentIndex === -1) {
			return null;
		}

		return {
			prevLink: currentIndex > 0 ? links[currentIndex - 1] : null,
			nextLink: currentIndex < links.length - 1 ? links[currentIndex + 1] : null,
		};
	}

	override render() {
		const paginationLinks = this.getPaginationLinks();
		if (!paginationLinks) {
			return null;
		}

		const { prevLink, nextLink } = paginationLinks;
		const prevTitle = prevLink?.textContent?.trim() || '';
		const nextTitle = nextLink?.textContent?.trim() || '';

		return (
			<>
				{prevLink ? (
					<a href={prevLink.pathname} class="group prev" aria-label={prevTitle}>
						<span class="pagination-label" aria-hidden="true">
							Previous
						</span>
						<span class="pagination-title">{prevTitle}</span>
					</a>
				) : (
					<div></div>
				)}
				{nextLink ? (
					<a href={nextLink.pathname} class="group next" aria-label={nextTitle}>
						<span class="pagination-label" aria-hidden="true">
							Next
						</span>
						<span class="pagination-title">{nextTitle}</span>
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
