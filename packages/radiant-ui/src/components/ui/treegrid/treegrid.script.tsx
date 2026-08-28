import { RadiantElement, customElement, event, onEvent, onUpdated, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { applyRovingTabindex, focusRovingItem } from '@/lib/roving-tabindex';

export type RuiTreegridProps = {
	label?: string;
	/** Selected row `data-row-id`. */
	value?: string;
};

export type RuiTreegridChangeDetail = {
	rowId: string;
	columnIndex: number;
};

type TreegridCellContext = {
	cell: HTMLElement;
	columnIndex: number;
	row: HTMLElement;
	rowCells: HTMLElement[];
	visibleRows: HTMLElement[];
};

/**
 * `<rui-treegrid>` — hierarchical grid with cell-only keyboard navigation.
 *
 * The custom element is a behavior host: it does not render rows. Import the script
 * and place light-DOM children that match the contract below, or use `RuiTreegrid`
 * with `columns` / `rows` or authored children inside the root surface.
 *
 * Expand/collapse with ArrowRight/ArrowLeft only from the first cell of a row
 * (APG cell-only focus). Enter or click on that cell toggles expansion; Space activates.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[role="treegrid"]` — root surface. The view sets `aria-label`.
 * - `[role="row"][data-row-id]` — data row. Host reads `data-row-id` for selection.
 * - `[role="gridcell"]` — direct child of a data row. Host sets `aria-selected` and
 *   roving `tabIndex`.
 *
 * Per row:
 * - `data-row-id` — row identity for `value` and `rui-change`.
 *
 * Optional (expandable rows):
 * - `aria-expanded` on a data row — when present, the host toggles the adjacent
 *   `[role="rowgroup"]` sibling's `hidden` and responds to ArrowRight/Left from
 *   the first cell, Enter, click, and `*`.
 * - `[role="rowgroup"]` — child rows container immediately following an expandable
 *   row. Host writes `hidden` from `aria-expanded`.
 *
 * Header rows (`[role="row"]` without `data-row-id`) and `[role="columnheader"]`
 * cells are presentation-only; the host does not query them for behavior.
 *
 * Do not set `aria-selected` or `tabIndex` on gridcells — the host owns those.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/
 * @element rui-treegrid
 * @attr {string} label - Accessible name for the treegrid (applied on `[role="treegrid"]` by the view).
 * @attr {string} value - Selected row `data-row-id`. Default: `''`.
 * @fires rui-change - Emitted with `{ rowId, columnIndex }` when a cell activates.
 *
 * @remarks
 * Minimum tree: `[role="treegrid"]` > `[role="row"][data-row-id]` > `[role="gridcell"]`;
 * expandable rows add `[role="rowgroup"]` > nested rows after the parent row.
 * BEM classes live on the `RuiTreegrid` view; the host never queries them.
 */
@customElement('rui-treegrid')
export class RuiTreegrid extends RadiantElement {
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiTreegridChangeDetail>;

	private getDataRows(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[role="row"][data-row-id]'));
	}

	private getVisibleRows(): HTMLElement[] {
		return this.getDataRows().filter((row) => {
			let parent = row.parentElement;
			while (parent && parent !== this) {
				if (parent.getAttribute('role') === 'rowgroup' && parent.hidden) {
					return false;
				}
				parent = parent.parentElement;
			}
			return true;
		});
	}

	private getRowCells(row: HTMLElement): HTMLElement[] {
		return Array.from(row.children).filter(
			(child): child is HTMLElement => child instanceof HTMLElement && child.getAttribute('role') === 'gridcell',
		);
	}

	private getVisibleCells(): HTMLElement[] {
		return this.getVisibleRows().flatMap((row) => this.getRowCells(row));
	}

	private getParentRow(row: HTMLElement): HTMLElement | null {
		const group = row.parentElement;
		if (!group || group.getAttribute('role') !== 'rowgroup') {
			return null;
		}

		const parent = group.previousElementSibling as HTMLElement | null;
		return parent?.getAttribute('role') === 'row' ? parent : null;
	}

	private syncExpanded(): void {
		for (const row of this.getDataRows()) {
			if (!row.hasAttribute('aria-expanded')) {
				continue;
			}

			const group = row.nextElementSibling as HTMLElement | null;
			if (group?.getAttribute('role') === 'rowgroup') {
				group.hidden = row.getAttribute('aria-expanded') === 'false';
			}
		}
	}

	private syncSelection(): void {
		const cells = this.getVisibleCells();
		let activeIndex = 0;

		for (const row of this.getDataRows()) {
			const rowId = row.getAttribute('data-row-id') ?? '';
			const selected = Boolean(this.value) && rowId === this.value;
			for (const cell of this.getRowCells(row)) {
				cell.setAttribute('aria-selected', String(selected));
				if (selected) {
					const index = cells.indexOf(cell);
					if (index >= 0) {
						activeIndex = index;
					}
				}
			}
		}

		if (cells.length > 0) {
			applyRovingTabindex(cells, activeIndex);
		}
	}

	protected override onConnected(): void {
		this.syncExpanded();
		this.syncSelection();
	}

	@onUpdated('value')
	onValueUpdated(): void {
		this.syncSelection();
	}

	private setExpanded(row: HTMLElement, expanded: boolean): void {
		row.setAttribute('aria-expanded', String(expanded));
		const group = row.nextElementSibling as HTMLElement | null;
		if (group?.getAttribute('role') === 'rowgroup') {
			group.hidden = !expanded;
		}
	}

	private activateCell(cell: HTMLElement): void {
		const row = cell.closest<HTMLElement>('[role="row"][data-row-id]');
		if (!row) {
			return;
		}

		const rowId = row.getAttribute('data-row-id') ?? '';
		const columnIndex = this.getRowCells(row).indexOf(cell);
		this.value = rowId;
		this.syncSelection();
		this.changeEvent.emit({ rowId, columnIndex });
		cell.focus();
	}

	private focusCell(row: HTMLElement, columnIndex: number): void {
		const rows = this.getVisibleRows();
		const rowIndex = rows.indexOf(row);
		if (rowIndex < 0) {
			return;
		}

		const cells = this.getVisibleCells();
		const rowCells = this.getRowCells(row);
		const target = rowCells[Math.min(Math.max(0, columnIndex), rowCells.length - 1)];
		const nextIndex = cells.indexOf(target);
		if (nextIndex >= 0) {
			focusRovingItem(cells, nextIndex);
		}
	}

	@onEvent({ selector: '[role="gridcell"]', type: 'click' })
	onCellClick(event: Event): void {
		const cell = (event.target as HTMLElement).closest<HTMLElement>('[role="gridcell"]');
		if (!cell || !this.contains(cell)) {
			return;
		}

		const row = cell.closest<HTMLElement>('[role="row"][data-row-id]');
		if (row) {
			const isFirstCell = this.getRowCells(row).indexOf(cell) === 0;
			if (isFirstCell && row.hasAttribute('aria-expanded')) {
				this.setExpanded(row, row.getAttribute('aria-expanded') !== 'true');
			}
		}

		this.activateCell(cell);
	}

	/**
	 * @remarks APG cell-only expansion: ArrowRight/Left and Enter on the first cell of an
	 * expandable row toggle expansion; other cells navigate or activate only.
	 */
	@onEvent({ selector: '[role="gridcell"]', type: 'keydown' })
	onCellKeydown(event: KeyboardEvent): void {
		const cell = (event.target as HTMLElement).closest<HTMLElement>('[role="gridcell"]');
		const row = cell?.closest<HTMLElement>('[role="row"][data-row-id]');
		if (!cell || !row) return;
		const context = this.createCellContext(cell, row);
		const handler = this.cellKeyHandlers[event.key];
		if (!handler) return;
		event.preventDefault();
		handler.call(this, context);
	}

	private readonly cellKeyHandlers: Record<string, (context: TreegridCellContext) => void> = {
		ArrowRight: this.moveRight,
		ArrowLeft: this.moveLeft,
		ArrowDown: this.moveDown,
		ArrowUp: this.moveUp,
		Home: this.focusFirstCell,
		End: this.focusLastCell,
		'*': this.expandAllRows,
		Enter: this.toggleOrActivateCell,
		' ': this.activateContextCell,
	};

	private createCellContext(cell: HTMLElement, row: HTMLElement): TreegridCellContext {
		return {
			cell,
			columnIndex: this.getRowCells(row).indexOf(cell),
			row,
			rowCells: this.getRowCells(row),
			visibleRows: this.getVisibleRows(),
		};
	}

	private moveRight(context: TreegridCellContext): void {
		if (this.setExpandedFromFirstCell(context, true)) return;
		if (context.columnIndex < context.rowCells.length - 1) this.focusCell(context.row, context.columnIndex + 1);
	}

	private moveLeft(context: TreegridCellContext): void {
		if (this.setExpandedFromFirstCell(context, false)) return;
		if (context.columnIndex > 0) {
			this.focusCell(context.row, context.columnIndex - 1);
			return;
		}
		const parent = this.getParentRow(context.row);
		if (parent) this.focusCell(parent, 0);
	}

	private moveDown(context: TreegridCellContext): void {
		this.focusAdjacentRow(context, 1);
	}

	private moveUp(context: TreegridCellContext): void {
		this.focusAdjacentRow(context, -1);
	}

	private focusAdjacentRow(context: TreegridCellContext, direction: 1 | -1): void {
		const index = context.visibleRows.indexOf(context.row);
		const row = context.visibleRows[index + direction];
		if (row) this.focusCell(row, context.columnIndex);
	}

	private focusFirstCell(context: TreegridCellContext): void {
		this.focusCell(context.row, 0);
	}

	private focusLastCell(context: TreegridCellContext): void {
		this.focusCell(context.row, context.rowCells.length - 1);
	}

	private expandAllRows(): void {
		for (const row of this.getDataRows()) if (row.hasAttribute('aria-expanded')) this.setExpanded(row, true);
		this.syncSelection();
	}

	private toggleOrActivateCell(context: TreegridCellContext): void {
		if (this.toggleExpansionFromFirstCell(context)) return;
		this.activateCell(context.cell);
	}

	private activateContextCell(context: TreegridCellContext): void {
		this.activateCell(context.cell);
	}

	private setExpandedFromFirstCell(context: TreegridCellContext, expanded: boolean): boolean {
		const isExpanded = context.row.getAttribute('aria-expanded') === 'true';
		if (context.columnIndex !== 0 || !context.row.hasAttribute('aria-expanded') || isExpanded === expanded)
			return false;
		this.setExpanded(context.row, expanded);
		this.syncSelection();
		return true;
	}

	private toggleExpansionFromFirstCell(context: TreegridCellContext): boolean {
		if (context.columnIndex !== 0 || !context.row.hasAttribute('aria-expanded')) return false;
		this.setExpanded(context.row, context.row.getAttribute('aria-expanded') !== 'true');
		this.syncSelection();
		return true;
	}
}
