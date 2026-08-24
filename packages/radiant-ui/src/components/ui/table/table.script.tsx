import { RadiantElement, customElement, event, onEvent, onUpdated, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { applyRovingTabindex } from '@/lib/roving-tabindex';
import { parseMultiValue, serializeMultiValue } from '../shared/multi-value';
import type { RuiCheckbox, RuiCheckboxChangeDetail } from '../checkbox/checkbox.script';

export type RuiTableSelectionMode = 'none' | 'single' | 'multiple';
export type RuiTableSortDirection = 'ascending' | 'descending';

export type RuiTableProps = {
	label?: string;
	ariaBusy?: 'true' | 'false';
	selectionMode?: RuiTableSelectionMode;
	/** Selected row ids. Multiple selections are comma-separated. */
	value?: string;
	sortColumn?: string;
	sortDirection?: RuiTableSortDirection;
};

export type RuiTableChangeDetail = { value: string };
export type RuiTableSortChangeDetail = { column: string; direction: RuiTableSortDirection };
export type RuiTableRowActionDetail = { rowId: string };

type RuiTableBindings = {
	label: string;
	ariaBusy: 'true' | 'false';
	selectionMode: RuiTableSelectionMode;
	sortColumn: string;
	sortDirection: RuiTableSortDirection;
};

/**
 * `<rui-table>` — a keyboard-navigable table with optional row selection and sorting.
 *
 * @remarks Use the `RuiTable` view to compose header, body, and rows in JSX. The host
 * coordinates selection, sorting, and APG keyboard behavior over that authored tree
 * without re-rendering it through a slot.
 *
 * @see https://react-aria.adobe.com/Table
 * @element rui-table
 * @attr {string} label - Accessible name for the table.
 * @attr {('true'|'false')} aria-busy - Whether the collection is currently updating.
 * @attr {('none'|'single'|'multiple')} selection-mode - Row selection mode. Default: `none`.
 * @attr {string} value - Selected row ids, comma-separated for multiple selection.
 * @attr {string} sort-column - Active sortable column id.
 * @attr {('ascending'|'descending')} sort-direction - Active sorting direction. Default: `ascending`.
 * @fires rui-change - Emitted after the selected row ids change.
 * @fires rui-sort-change - Emitted after a sortable header changes direction.
 * @fires rui-row-action - Emitted when an actionable row is activated.
 */
@customElement('rui-table')
export class RuiTable extends RadiantElement<RuiTableBindings> {
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, attribute: 'aria-busy', defaultValue: 'false' }) ariaBusy: 'true' | 'false';
	@prop({ type: String, attribute: 'selection-mode', defaultValue: 'none' }) selectionMode: RuiTableSelectionMode;
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;
	@prop({ type: String, attribute: 'sort-column', reflect: true, defaultValue: '' }) sortColumn: string;
	@prop({ type: String, attribute: 'sort-direction', reflect: true, defaultValue: 'ascending' })
	sortDirection: RuiTableSortDirection;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiTableChangeDetail>;

	@event({ name: 'rui-sort-change', bubbles: true, composed: true })
	sortChangeEvent: EventEmitter<RuiTableSortChangeDetail>;

	@event({ name: 'rui-row-action', bubbles: true, composed: true })
	rowActionEvent: EventEmitter<RuiTableRowActionDetail>;

	private structureObserver?: MutationObserver;
	private rovingSyncPending = false;

	override connectedCallback(): void {
		super.connectedCallback();
		this.observeStructure();
	}

	protected override onConnected(): void {
		this.syncSelectionState();
		this.syncSorting();
		this.syncRovingTabindex();
	}

	override disconnectedCallback(): void {
		this.structureObserver?.disconnect();
		this.structureObserver = undefined;
		super.disconnectedCallback();
	}

	@onUpdated(['value', 'selectionMode'])
	onSelectionUpdated(): void {
		this.syncSelectionState();
	}

	@onUpdated(['sortColumn', 'sortDirection'])
	onSortUpdated(): void {
		this.syncSorting();
	}

	private observeStructure(): void {
		if (typeof MutationObserver === 'undefined') {
			return;
		}

		this.structureObserver?.disconnect();
		this.structureObserver = new MutationObserver(() => this.queueRovingSync());
		this.structureObserver.observe(this, { childList: true, subtree: true });
	}

	private queueRovingSync(): void {
		if (this.rovingSyncPending) {
			return;
		}
		this.rovingSyncPending = true;
		queueMicrotask(() => {
			this.rovingSyncPending = false;
			if (!this.isConnected) {
				return;
			}
			this.syncRovingTabindex();
		});
	}

	private getRows(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[data-table-row]'));
	}

	private getSelectableRows(): HTMLElement[] {
		return this.getRows().filter((row) => !row.hidden && row.getAttribute('aria-disabled') !== 'true');
	}

	private getRowCells(row: HTMLElement): HTMLElement[] {
		return Array.from(row.children).filter(
			(child): child is HTMLElement => child instanceof HTMLElement && child.hasAttribute('data-table-cell'),
		);
	}

	private getFocusableCells(): HTMLElement[] {
		return this.getSelectableRows().flatMap((row) => this.getRowCells(row));
	}

	private selectedIds(): string[] {
		return this.selectionMode === 'multiple' ? parseMultiValue(this.value) : this.value ? [this.value] : [];
	}

	private setSelectedIds(ids: string[]): void {
		this.value = this.selectionMode === 'multiple' ? serializeMultiValue(ids) : (ids[0] ?? '');
		this.syncSelectionState();
		this.changeEvent.emit({ value: this.value });
	}

	private getActiveCellPosition(): { rowId: string; columnIndex: number } | null {
		const cells = this.getFocusableCells();
		const activeIndex = cells.findIndex((cell) => cell.tabIndex === 0);
		const activeCell =
			activeIndex >= 0
				? cells[activeIndex]
				: (this.querySelector<HTMLElement>('[data-table-cell]:focus') ?? null);
		if (!activeCell) {
			return null;
		}

		const row = activeCell.closest<HTMLElement>('[data-table-row]');
		if (!row) {
			return null;
		}

		const columnIndex = this.getRowCells(row).indexOf(activeCell);
		if (columnIndex < 0) {
			return null;
		}

		return {
			rowId: row.getAttribute('data-table-row') ?? '',
			columnIndex,
		};
	}

	private syncSelectionState(): void {
		const selected = new Set(this.selectedIds());
		const selectableRows = this.getSelectableRows();
		const canSelect = this.selectionMode !== 'none';

		for (const row of this.getRows()) {
			const rowId = row.getAttribute('data-table-row') ?? '';
			if (canSelect) {
				row.setAttribute('aria-selected', String(selected.has(rowId)));
			} else {
				row.removeAttribute('aria-selected');
			}
			const rowCheckbox = row.querySelector<RuiCheckbox>('rui-checkbox[data-table-select-row]');
			if (rowCheckbox) {
				rowCheckbox.checked = canSelect && selected.has(rowId);
				rowCheckbox.disabled = !canSelect || row.getAttribute('aria-disabled') === 'true';
			}
		}

		for (const selectAll of this.querySelectorAll<RuiCheckbox>('rui-checkbox[data-table-select-all]')) {
			const selectedCount = selectableRows.filter((row) =>
				selected.has(row.getAttribute('data-table-row') ?? ''),
			).length;
			const canSelectAll = this.selectionMode === 'multiple';
			selectAll.checked = canSelectAll && selectableRows.length > 0 && selectedCount === selectableRows.length;
			selectAll.indeterminate = canSelectAll && selectedCount > 0 && selectedCount < selectableRows.length;
			selectAll.disabled = !canSelectAll || selectableRows.length === 0;
		}
	}

	private syncRovingTabindex(): void {
		const cells = this.getFocusableCells();
		if (cells.length === 0) {
			return;
		}

		const position = this.getActiveCellPosition();
		let activeIndex = cells.findIndex((cell) => cell.tabIndex === 0);
		if (position) {
			const row = this.getRows().find((candidate) => candidate.getAttribute('data-table-row') === position.rowId);
			if (row) {
				const target = this.getRowCells(row)[position.columnIndex];
				const index = target ? cells.indexOf(target) : -1;
				if (index >= 0) {
					activeIndex = index;
				}
			}
		}

		applyRovingTabindex(cells, activeIndex >= 0 ? activeIndex : 0);
	}

	private syncSorting(): void {
		for (const column of this.querySelectorAll<HTMLElement>('[data-table-column]')) {
			const id = column.getAttribute('data-table-column');
			if (id && id === this.sortColumn) {
				column.setAttribute('aria-sort', this.sortDirection);
			} else {
				column.removeAttribute('aria-sort');
			}
		}
	}

	private isInteractiveTarget(target: HTMLElement): boolean {
		return Boolean(target.closest('button, input, select, textarea, a[href], [contenteditable="true"]'));
	}

	private selectRow(row: HTMLElement, toggle = false): void {
		if (this.selectionMode === 'none' || row.getAttribute('aria-disabled') === 'true') {
			return;
		}

		const rowId = row.getAttribute('data-table-row') ?? '';
		if (!rowId) {
			return;
		}

		if (this.selectionMode === 'single') {
			this.setSelectedIds([rowId]);
			return;
		}

		const selected = new Set(this.selectedIds());
		if (toggle && selected.has(rowId)) {
			selected.delete(rowId);
		} else {
			selected.add(rowId);
		}
		this.setSelectedIds([...selected]);
	}

	private focusCell(row: HTMLElement, columnIndex: number): void {
		const cells = this.getFocusableCells();
		const rowCells = this.getRowCells(row);
		const target = rowCells[Math.min(Math.max(columnIndex, 0), rowCells.length - 1)];
		const index = cells.indexOf(target);
		if (index < 0) {
			return;
		}

		applyRovingTabindex(cells, index);
		target.focus();
		target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}

	private activateRow(row: HTMLElement): void {
		if (!row.hasAttribute('data-table-actionable') || row.getAttribute('aria-disabled') === 'true') {
			return;
		}
		const rowId = row.getAttribute('data-table-row') ?? '';
		if (rowId) {
			this.rowActionEvent.emit({ rowId });
		}
	}

	@onEvent({ selector: '[data-table-cell]', type: 'click' })
	onCellClick(event: Event): void {
		const target = event.target as HTMLElement;
		if (this.isInteractiveTarget(target)) {
			return;
		}
		const cell = target.closest<HTMLElement>('[data-table-cell]');
		const row = cell?.closest<HTMLElement>('[data-table-row]');
		if (!cell || !row || !this.contains(row)) {
			return;
		}
		this.selectRow(row, this.selectionMode === 'multiple');
		this.focusCell(row, this.getRowCells(row).indexOf(cell));
	}

	@onEvent({ selector: '[data-table-cell]', type: 'dblclick' })
	onCellDoubleClick(event: Event): void {
		const target = event.target as HTMLElement;
		if (this.isInteractiveTarget(target)) {
			return;
		}
		const row = target.closest<HTMLElement>('[data-table-row]');
		if (row && this.contains(row)) {
			this.activateRow(row);
		}
	}

	@onEvent({ selector: '[data-table-cell]', type: 'keydown' })
	onCellKeydown(event: KeyboardEvent): void {
		const target = event.target as HTMLElement;
		if (this.isInteractiveTarget(target)) {
			return;
		}
		const cell = target.closest<HTMLElement>('[data-table-cell]');
		const row = cell?.closest<HTMLElement>('[data-table-row]');
		if (!cell || !row) {
			return;
		}

		const rows = this.getSelectableRows();
		const rowIndex = rows.indexOf(row);
		const rowCells = this.getRowCells(row);
		const columnIndex = rowCells.indexOf(cell);

		switch (event.key) {
			case 'ArrowRight':
				event.preventDefault();
				this.focusCell(row, columnIndex + 1);
				return;
			case 'ArrowLeft':
				event.preventDefault();
				this.focusCell(row, columnIndex - 1);
				return;
			case 'ArrowDown':
				event.preventDefault();
				this.focusCell(rows[Math.min(rowIndex + 1, rows.length - 1)] ?? row, columnIndex);
				return;
			case 'ArrowUp':
				event.preventDefault();
				this.focusCell(rows[Math.max(rowIndex - 1, 0)] ?? row, columnIndex);
				return;
			case 'Home':
				event.preventDefault();
				this.focusCell(row, 0);
				return;
			case 'End':
				event.preventDefault();
				this.focusCell(row, rowCells.length - 1);
				return;
			case ' ':
				event.preventDefault();
				this.selectRow(row, true);
				return;
			case 'Enter':
				event.preventDefault();
				this.activateRow(row);
				return;
			default:
				return;
		}
	}

	@onEvent({ selector: 'rui-checkbox[data-table-select-row]', type: 'rui-change' })
	onRowSelectionChange(event: CustomEvent<RuiCheckboxChangeDetail>): void {
		const checkbox = event.target as RuiCheckbox;
		const row = checkbox.closest<HTMLElement>('[data-table-row]');
		if (!row || !this.contains(row)) {
			return;
		}
		const rowId = row.getAttribute('data-table-row') ?? '';
		if (!event.detail.checked) {
			const selected = new Set(this.selectedIds());
			selected.delete(rowId);
			this.setSelectedIds([...selected]);
			return;
		}
		this.selectRow(row);
	}

	@onEvent({ selector: 'rui-checkbox[data-table-select-all]', type: 'rui-change' })
	onSelectAllChange(event: CustomEvent<RuiCheckboxChangeDetail>): void {
		if (this.selectionMode !== 'multiple') {
			return;
		}
		this.setSelectedIds(
			event.detail.checked ? this.getSelectableRows().map((row) => row.getAttribute('data-table-row') ?? '') : [],
		);
	}

	@onEvent({ selector: '[data-table-sort]', type: 'click' })
	onSortClick(event: Event): void {
		const button = (event.target as HTMLElement).closest<HTMLElement>('[data-table-sort]');
		const column = button?.getAttribute('data-table-sort');
		if (!column) {
			return;
		}
		this.sortDirection =
			column === this.sortColumn && this.sortDirection === 'ascending' ? 'descending' : 'ascending';
		this.sortColumn = column;
		this.syncSorting();
		this.sortChangeEvent.emit({ column, direction: this.sortDirection });
	}
}
