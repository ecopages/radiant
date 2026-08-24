import { RadiantElement, customElement, event, onEvent, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';

export type RuiPaginationProps = {
	label?: string;
	page?: number;
	pageCount?: number;
	disabled?: boolean;
	siblingCount?: number;
};

export type RuiPageChangeDetail = { page: number };

/**
 * Default accessible name for the navigation landmark.
 *
 * @remarks Must match the host `@prop` default: the SSR view labels the nav
 * with it so the landmark is named before hydration.
 */
export const PAGINATION_DEFAULT_LABEL = 'Pagination';

export function clampPage(page: number, pageCount: number): number {
	return Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
}

/**
 * `<rui-pagination>` — page navigation with previous/next controls and compact page ranges.
 *
 * @element rui-pagination
 * @attr {string} label - Accessible name for the navigation landmark. Default: `Pagination`.
 * @attr {number} page - Current one-based page. Default: `1`.
 * @attr {number} page-count - Total number of pages. Default: `1`.
 * @attr {boolean} disabled - Disable page navigation. Default: `false`.
 * @attr {number} sibling-count - Pages shown on each side of the current page. Default: `1`.
 * @slot - Navigation controls. `RuiPagination` supplies the default chrome when omitted.
 * @fires rui-page-change - Emitted when a page is requested; detail carries the one-based `page`.
 * @cssclass rui-pagination - Navigation root.
 * @cssclass rui-pagination__list - Page controls list.
 * @cssclass rui-pagination__link - Previous, next, and page control.
 * @cssclass rui-pagination__page - Page-number item; `__page--current` marks the active page.
 * @cssclass rui-pagination--compact - Force previous / `{page} / {count}` / next chrome.
 * @cssclass rui-pagination__status - Non-interactive `{page} / {count}` label in compact chrome.
 * @cssclass rui-pagination__ellipsis - Hidden range marker between page numbers.
 */
@customElement('rui-pagination')
export class RuiPagination extends RadiantElement {
	@prop({ type: String, defaultValue: PAGINATION_DEFAULT_LABEL }) label: string;
	@prop({ type: Number, reflect: true, defaultValue: 1 }) page: number;
	@prop({ type: Number, attribute: 'page-count', defaultValue: 1 }) pageCount: number;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) disabled: boolean;
	@prop({ type: Number, attribute: 'sibling-count', defaultValue: 1 }) siblingCount: number;

	@event({ name: 'rui-page-change', bubbles: true, composed: true })
	pageChangeEvent: EventEmitter<RuiPageChangeDetail>;

	private changePage(page: number): void {
		if (this.disabled) return;
		const next = clampPage(page, Math.max(1, Math.floor(this.pageCount) || 1));
		if (next === this.page) return;
		this.pageChangeEvent.emit({ page: next });
	}

	@onEvent({ selector: '[data-pagination-page]', type: 'click' })
	onPageClick(event: Event): void {
		const button = (event.target as HTMLElement).closest<HTMLElement>('[data-pagination-page]');
		const page = Number(button?.getAttribute('data-pagination-page'));
		if (Number.isInteger(page)) this.changePage(page);
	}
}
