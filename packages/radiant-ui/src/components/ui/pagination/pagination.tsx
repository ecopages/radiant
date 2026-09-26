import type { JsxCustomElementAttributes, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RuiIconChevronLeft, RuiIconChevronRight } from '@/lib/icons';
import { RuiButton } from '../button';
import {
	PAGINATION_DEFAULT_LABEL,
	clampPage,
	type RuiPagination as RuiPaginationElement,
	type RuiPaginationProps,
} from './pagination.script';
import './pagination.script';

type PageItem = number | 'start-ellipsis' | 'end-ellipsis';

function getPageItems(page: number, pageCount: number, siblingCount: number): PageItem[] {
	const visibleCount = siblingCount * 2 + 5;
	if (pageCount <= visibleCount) {
		return Array.from({ length: pageCount }, (_, index) => index + 1);
	}

	const start = Math.max(2, page - siblingCount);
	const end = Math.min(pageCount - 1, page + siblingCount);
	const items: PageItem[] = [1];
	if (start > 2) items.push('start-ellipsis');
	for (let current = start; current <= end; current += 1) items.push(current);
	if (end < pageCount - 1) items.push('end-ellipsis');
	items.push(pageCount);
	return items;
}

/**
 * Copy for the default navigation chrome. Defaults are English; pass translations to localize.
 */
export type RuiPaginationLabels = {
	/** Visible previous-control text (visually hidden in compact chrome). Default: `Previous`. */
	previousText?: string;
	/** Accessible name of the previous control. Default: `Go to previous page`. */
	previousLabel?: string;
	/** Visible next-control text (visually hidden in compact chrome). Default: `Next`. */
	nextText?: string;
	/** Accessible name of the next control. Default: `Go to next page`. */
	nextLabel?: string;
	/** Accessible name of a page-number control. Default: `Go to page {page}`. */
	pageLabel?: (page: number) => string;
	/** Page position shown in compact chrome. Default: `Page {page} of {pageCount}`. */
	statusLabel?: (page: number, pageCount: number) => string;
};

export type RuiPaginationNavProps = RuiPaginationLabels & {
	label: string;
	page: number;
	pageCount: number;
	disabled?: boolean;
	siblingCount?: number;
};

/**
 * Default previous / page / next chrome for `RuiPagination`. Stamps `[data-pagination-page]`
 * on each navigable control.
 */
export function RuiPaginationNav({
	label,
	page,
	pageCount,
	disabled = false,
	siblingCount = 1,
	previousText = 'Previous',
	previousLabel = 'Go to previous page',
	nextText = 'Next',
	nextLabel = 'Go to next page',
	pageLabel = (item) => `Go to page ${item}`,
	statusLabel = (current, count) => `Page ${current} of ${count}`,
}: RuiPaginationNavProps) {
	const resolvedPageCount = Math.max(1, Math.floor(pageCount) || 1);
	const resolvedPage = clampPage(page, resolvedPageCount);
	const resolvedSiblingCount = Math.max(0, Math.floor(siblingCount) || 0);
	const items = getPageItems(resolvedPage, resolvedPageCount, resolvedSiblingCount);

	return (
		<nav class="rui-pagination__nav" aria-label={label}>
			<ul class="rui-pagination__list">
				<li>
					<RuiButton
						variant="ghost"
						size="sm"
						class="rui-pagination__link rui-pagination__link--previous"
						data-pagination-page={resolvedPage - 1}
						aria-label={previousLabel}
						disabled={disabled || resolvedPage <= 1}
					>
						<RuiIconChevronLeft />
						<span>{previousText}</span>
					</RuiButton>
				</li>
				{items.map((item) =>
					typeof item === 'number' ? (
						<li
							key={item}
							class={cx('rui-pagination__page', item === resolvedPage && 'rui-pagination__page--current')}
						>
							<RuiButton
								variant={item === resolvedPage ? 'filled' : 'ghost'}
								size="sm"
								square
								class="rui-pagination__link"
								data-pagination-page={item}
								aria-label={pageLabel(item)}
								aria-current={item === resolvedPage ? 'page' : undefined}
								disabled={disabled}
							>
								{item}
							</RuiButton>
						</li>
					) : (
						<li key={item} class="rui-pagination__ellipsis" aria-hidden="true">
							…
						</li>
					),
				)}
				<li class="rui-pagination__status" aria-live="polite">
					<span class="rui-pagination__status-label">{statusLabel(resolvedPage, resolvedPageCount)}</span>
				</li>
				<li>
					<RuiButton
						variant="ghost"
						size="sm"
						class="rui-pagination__link rui-pagination__link--next"
						data-pagination-page={resolvedPage + 1}
						aria-label={nextLabel}
						disabled={disabled || resolvedPage >= resolvedPageCount}
					>
						<span>{nextText}</span>
						<RuiIconChevronRight />
					</RuiButton>
				</li>
			</ul>
		</nav>
	);
}

/**
 * Accessible page navigation for a controlled collection. Stamps `<rui-pagination>`;
 * renders `RuiPaginationNav` by default (each link carries `[data-pagination-page]`).
 *
 * @remarks Pass `children` to replace the navigation chrome while keeping the
 * `rui-pagination` event contract. `RuiPaginationLabels` props localize the default
 * chrome; they are view-only and never reach the host element.
 *
 * @cssclass rui-pagination - Navigation root on the host.
 * @cssclass rui-pagination__page - Page-number item; `__page--current` marks the active page.
 * @cssclass rui-pagination--compact - Force the narrow chrome used below `40rem`: icon-only previous / next around the page position.
 * @cssclass rui-pagination__status - Non-interactive page position in compact chrome.
 * @cssclass rui-pagination__status-label - Muted “Page {n} of {m}” copy; hidden with full page list.
 * @cssclass rui-pagination__ellipsis - Hidden range marker between page numbers.
 */
export function RuiPagination({
	children,
	label = PAGINATION_DEFAULT_LABEL,
	page = 1,
	pageCount = 1,
	disabled = false,
	siblingCount = 1,
	previousText,
	previousLabel,
	nextText,
	nextLabel,
	pageLabel,
	statusLabel,
	class: className,
	...props
}: JsxCustomElementAttributes<RuiPaginationElement, RuiPaginationProps> &
	RuiPaginationLabels & {
		children?: JsxRenderable;
	}) {
	const resolvedPageCount = Math.max(1, Math.floor(pageCount) || 1);
	const resolvedPage = clampPage(page, resolvedPageCount);
	const resolvedSiblingCount = Math.max(0, Math.floor(siblingCount) || 0);

	return (
		<rui-pagination
			{...props}
			class={cx('rui-pagination', className)}
			label={label}
			page={resolvedPage}
			pageCount={resolvedPageCount}
			disabled={disabled}
			siblingCount={resolvedSiblingCount}
		>
			{children ?? (
				<RuiPaginationNav
					label={label}
					page={resolvedPage}
					pageCount={resolvedPageCount}
					disabled={disabled}
					siblingCount={resolvedSiblingCount}
					previousText={previousText}
					previousLabel={previousLabel}
					nextText={nextText}
					nextLabel={nextLabel}
					pageLabel={pageLabel}
					statusLabel={statusLabel}
				/>
			)}
		</rui-pagination>
	);
}
