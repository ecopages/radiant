import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { attachRadiantStylesheets } from '@/lib/radiant-view';

export type RuiChipListProps = JsxHtmlPropsWithChildren<{
	'aria-label'?: string;
	id?: string;
}>;

/** Horizontal wrap list for presentational chips. */
export function RuiChipList({ children, class: className, 'aria-label': ariaLabel, ...props }: RuiChipListProps) {
	return (
		<ul {...props} class={cx('rui-chip-list', className)} aria-label={ariaLabel}>
			{children}
		</ul>
	);
}

export type RuiChipListItemProps = JsxHtmlPropsWithChildren;

/** List item wrapper for a chip. */
export function RuiChipListItem({ children, class: className, ...props }: RuiChipListItemProps) {
	return (
		<li {...props} class={cx('rui-chip-list__item', className)}>
			{children}
		</li>
	);
}

attachRadiantStylesheets(RuiChipList, ['./chip-list.css'], import.meta.url);
