import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent, state } from '@ecopages/radiant';
import { type AdjacentNavLink, findAdjacentNavItems } from '@/lib/adjacent-nav-item';

type PaginationLink = AdjacentNavLink;

type PaginationData = {
	pages: PaginationLink[];
};

function readPaginationPages(): PaginationData['pages'] {
	const node = document.getElementById('docs-pagination-data');
	if (!node?.textContent) {
		return [];
	}

	try {
		const parsed = JSON.parse(node.textContent) as PaginationData;
		return parsed.pages ?? [];
	} catch {
		return [];
	}
}

@customElement('radiant-docs-pagination')
export class RadiantDocsPagination extends RadiantElement {
	@state prevLink: PaginationLink | null = null;
	@state nextLink: PaginationLink | null = null;

	override connectedCallback(): void {
		super.connectedCallback();
		this.renderPagination();
	}

	@onEvent({ document: true, type: 'eco:page-load' })
	onPageLoad(): void {
		this.renderPagination();
	}

	@onEvent({ document: true, type: 'eco:after-swap' })
	onAfterSwap(): void {
		this.renderPagination();
	}

	renderPagination(): void {
		const pages = readPaginationPages();
		const adjacent = findAdjacentNavItems(pages, window.location.pathname);
		this.prevLink = adjacent?.prev ?? null;
		this.nextLink = adjacent?.next ?? null;
	}

	override render() {
		if (!this.prevLink && !this.nextLink) {
			return null;
		}

		return (
			<>
				{this.prevLink ? (
					<a href={this.prevLink.href} class="group prev">
						<span class="pagination-label">Previous</span>
						<span class="pagination-title">{this.prevLink.title}</span>
					</a>
				) : (
					<div></div>
				)}
				{this.nextLink ? (
					<a href={this.nextLink.href} class="group next">
						<span class="pagination-label">Next</span>
						<span class="pagination-title">{this.nextLink.title}</span>
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
