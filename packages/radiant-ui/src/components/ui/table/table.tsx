import type { JsxCustomElementAttributes, JsxElementProps } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import { RuiCheckbox } from '../checkbox';
import type { RuiTable as RuiTableElement, RuiTableProps } from './table.script';
import './table.script';

export type RuiTableHeaderProps = JsxElementProps<HTMLDivElement>;

/** Header row group for table columns. */
export function RuiTableHeader({ children, class: className, ...props }: RuiTableHeaderProps) {
	return (
		<div {...props} role="rowgroup" class={cx('rui-table__header', className)}>
			<div class="rui-table__row" role="row">
				{children}
			</div>
		</div>
	);
}

export type RuiTableBodyProps = JsxElementProps<HTMLDivElement>;

/** Data row group for table rows. */
export function RuiTableBody({ children, class: className, ...props }: RuiTableBodyProps) {
	return (
		<div {...props} role="rowgroup" class={cx('rui-table__body', className)}>
			{children}
		</div>
	);
}

export type RuiTableFooterProps = JsxElementProps<HTMLDivElement>;

/** Footer row group for summaries or aggregate values. */
export function RuiTableFooter({ children, class: className, ...props }: RuiTableFooterProps) {
	return (
		<div {...props} role="rowgroup" class={cx('rui-table__footer', className)}>
			<div class="rui-table__row" role="row">
				{children}
			</div>
		</div>
	);
}

export type RuiTableColumnProps = JsxElementProps<HTMLDivElement> & {
	id: string;
	allowsSorting?: boolean;
	isRowHeader?: boolean;
};

/** Column header with optional sort control. */
export function RuiTableColumn({
	id,
	allowsSorting = false,
	isRowHeader = false,
	children,
	class: className,
	...props
}: RuiTableColumnProps) {
	return (
		<div
			{...props}
			role="columnheader"
			data-table-column={id}
			data-table-row-header={isRowHeader ? '' : undefined}
			class={cx('rui-table__column', className)}
		>
			{allowsSorting ? (
				<button type="button" data-table-sort={id} class="rui-table__sort">
					<span>{children}</span>
					<span class="rui-table__sort-indicator" aria-hidden="true"></span>
				</button>
			) : (
				children
			)}
		</div>
	);
}

export type RuiTableRowProps = JsxElementProps<HTMLDivElement> & {
	id: string;
	disabled?: boolean;
	actionable?: boolean;
};

/** A selectable or actionable data row. */
export function RuiTableRow({ id, disabled, actionable, children, class: className, ...props }: RuiTableRowProps) {
	return (
		<div
			{...props}
			role="row"
			data-table-row={id}
			data-table-actionable={actionable ? '' : undefined}
			aria-disabled={disabled ? 'true' : undefined}
			class={cx('rui-table__row', className)}
		>
			{children}
		</div>
	);
}

export type RuiTableCellProps = JsxElementProps<HTMLDivElement> & {
	isRowHeader?: boolean;
};

/** A data cell, or the primary row header when `isRowHeader` is set. */
export function RuiTableCell({ isRowHeader = false, children, class: className, ...props }: RuiTableCellProps) {
	return (
		<div
			{...props}
			role={isRowHeader ? 'rowheader' : 'gridcell'}
			data-table-cell
			tabindex={-1}
			class={cx('rui-table__cell', className)}
		>
			{children}
		</div>
	);
}

export type RuiTableSelectionCellProps = JsxElementProps<HTMLDivElement> & {
	scope: 'all' | 'row';
	label?: string;
};

/** Selection checkbox cell for the header (`all`) or a data row (`row`). */
export function RuiTableSelectionCell({ scope, label, class: className, ...props }: RuiTableSelectionCellProps) {
	const all = scope === 'all';
	return (
		<div
			{...props}
			role={all ? 'columnheader' : 'gridcell'}
			data-table-cell
			data-table-selection-cell={scope}
			class={cx('rui-table__selection-cell', className)}
		>
			<RuiCheckbox data-table-select-all={all ? '' : undefined} data-table-select-row={all ? undefined : ''}>
				<span class="sr-only">{label ?? (all ? 'Select all rows' : 'Select row')}</span>
			</RuiCheckbox>
		</div>
	);
}

export type RuiTableEmptyStateProps = JsxElementProps<HTMLDivElement> & {
	colSpan: number;
};

/** A full-width table row used when a filtered collection has no results. */
export function RuiTableEmptyState({ colSpan, children, class: className, ...props }: RuiTableEmptyStateProps) {
	const resolvedColSpan = Math.max(1, Math.floor(colSpan));
	return (
		<div role="row" class="rui-table__row rui-table__row--empty">
			<div
				{...props}
				role="gridcell"
				aria-colspan={resolvedColSpan}
				class={cx('rui-table__empty-state', className)}
			>
				<span class="rui-table__empty-state-message">{children}</span>
			</div>
			{Array.from({ length: resolvedColSpan - 1 }, (_, index) => (
				<div key={index} aria-hidden="true" class="rui-table__empty-state-spacer" />
			))}
		</div>
	);
}

/**
 * React Aria–inspired composable data table.
 *
 * @remarks The table owns keyboard navigation, row selection, and sorting state.
 * Callers retain ownership of their collection and reorder it after `rui-sort-change`.
 * Prefer `RuiGrid` for simple read-only grids and `RuiTreegrid` for expandable hierarchies.
 *
 * @cssclass rui-table - Table surface (`role="grid"`).
 */
export function RuiTable({
	children,
	label,
	ariaBusy,
	selectionMode,
	...props
}: JsxCustomElementAttributes<RuiTableElement, RuiTableProps>) {
	return (
		<rui-table {...props} label={label} ariaBusy={ariaBusy} selectionMode={selectionMode}>
			<div
				class="rui-table"
				role="grid"
				aria-label={label || undefined}
				aria-busy={ariaBusy === 'true' ? 'true' : undefined}
				aria-multiselectable={selectionMode === 'multiple' ? 'true' : undefined}
			>
				{children}
			</div>
		</rui-table>
	);
}
