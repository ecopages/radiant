import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { cx } from '@/lib/cx';

export type RuiChipListProps = JsxHtmlPropsWithChildren<{
	'aria-label'?: string;
	id?: string;
}>;

/**
 * Horizontal wrap list for presentational chips.
 *
 * @cssclass rui-chip-list - List container (`<ul>`).
 */
export function RuiChipList({ children, class: className, 'aria-label': ariaLabel, ...props }: RuiChipListProps) {
	return (
		<ul {...props} class={cx('rui-chip-list', className)} aria-label={ariaLabel}>
			{children}
		</ul>
	);
}

export type RuiChipListItemProps = JsxHtmlPropsWithChildren;

/**
 * List item wrapper for a chip.
 *
 * @cssclass rui-chip-list__item - List item (`<li>`).
 */
export function RuiChipListItem({ children, class: className, ...props }: RuiChipListItemProps) {
	return (
		<li {...props} class={cx('rui-chip-list__item', className)}>
			{children}
		</li>
	);
}
