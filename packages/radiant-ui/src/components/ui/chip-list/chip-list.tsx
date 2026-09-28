import type { JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';

export type RuiChipListProps = JsxElementProps<HTMLUListElement>;

/**
 * Horizontal wrap list for presentational chips.
 *
 * @cssclass rui-chip-list - List container (`<ul>`).
 */
export function RuiChipList({ children, class: className, ...props }: RuiChipListProps) {
	return (
		<ul {...props} class={cx('rui-chip-list', className)}>
			{children}
		</ul>
	);
}

export type RuiChipListItemProps = JsxElementProps<HTMLLIElement>;

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
