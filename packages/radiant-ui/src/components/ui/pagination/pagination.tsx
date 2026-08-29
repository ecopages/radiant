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

export type RuiPaginationNavProps = {
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
						aria-label="Go to previous page"
						disabled={disabled || resolvedPage <= 1}
					>
						<RuiIconChevronLeft />
						<span>Previous</span>
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
								aria-label={`Go to page ${item}`}
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
				<li class="rui-pagination__status">
					{resolvedPage} / {resolvedPageCount}
				</li>
				<li>
					<RuiButton
						variant="ghost"
						size="sm"
						class="rui-pagination__link rui-pagination__link--next"
						data-pagination-page={resolvedPage + 1}
						aria-label="Go to next page"
						disabled={disabled || resolvedPage >= resolvedPageCount}
					>
						<span>Next</span>
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
 * `rui-pagination` event contract.
 *
 * @cssclass rui-pagination - Navigation root on the host.
 * @cssclass rui-pagination__page - Page-number item; `__page--current` marks the active page.
 * @cssclass rui-pagination--compact - Force previous / `{page} / {count}` / next chrome.
 * @cssclass rui-pagination__status - Non-interactive `{page} / {count}` label in compact chrome.
 * @cssclass rui-pagination__ellipsis - Hidden range marker between page numbers.
 */
export function RuiPagination({
	children,
	label = PAGINATION_DEFAULT_LABEL,
	page = 1,
	pageCount = 1,
	disabled = false,
	siblingCount = 1,
	class: className,
	...props
}: JsxCustomElementAttributes<RuiPaginationElement, RuiPaginationProps> & {
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
				/>
			)}
		</rui-pagination>
	);
}
