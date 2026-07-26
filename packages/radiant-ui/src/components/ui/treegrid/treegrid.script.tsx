import { RadiantElement, customElement, event, onEvent, onUpdated, prop } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { applyRovingTabindex, focusRovingItem } from '../../../lib/roving-tabindex';

export type RuiTreegridProps = {
	label?: string;
	/** Selected row `data-row-id`. */
	value?: string;
};

export type RuiTreegridChangeDetail = {
	rowId: string;
	columnIndex: number;
};

type RuiTreegridBindings = {
	label: string;
};

/**
 * `<rui-treegrid>` — a hierarchical grid navigated with arrow keys.
 *
 * Implements a read-only APG Treegrid: rows may expand/collapse to reveal child
 * rows, and `role="gridcell"` descendants are focused with roving tabindex.
 *
 * Expand/collapse with ArrowRight/ArrowLeft only from the first cell of a row
 * (APG cell-only focus). Enter on that cell toggles expansion; Space selects.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/
 * @element rui-treegrid
 * @fires rui-change
 */
@customElement('rui-treegrid')
export class RuiTreegrid extends RadiantElement<RuiTreegridBindings> {
	@prop({ type: String, defaultValue: '' }) label: string;
	@prop({ type: String, reflect: true, defaultValue: '' }) value: string;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiTreegridChangeDetail>;

	private readonly resolvedAriaLabel = this.$.label.map((label) => label || undefined);

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
		return Array.from(row.querySelectorAll<HTMLElement>(':scope > [role="gridcell"]'));
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

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => {
			this.syncExpanded();
			this.syncSelection();
		});
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

		this.activateCell(cell);
	}

	@onEvent({ selector: '[role="gridcell"]', type: 'keydown' })
	onCellKeydown(event: KeyboardEvent): void {
		const cell = (event.target as HTMLElement).closest<HTMLElement>('[role="gridcell"]');
		const row = cell?.closest<HTMLElement>('[role="row"][data-row-id]');
		if (!cell || !row) {
			return;
		}

		const visibleRows = this.getVisibleRows();
		const rowIndex = visibleRows.indexOf(row);
		const rowCells = this.getRowCells(row);
		const colIndex = rowCells.indexOf(cell);
		const isFirstCell = colIndex === 0;
		const isExpandable = row.hasAttribute('aria-expanded');
		const isExpanded = row.getAttribute('aria-expanded') === 'true';

		switch (event.key) {
			case 'ArrowRight': {
				event.preventDefault();
				// APG cell-only: expand only from the first cell of a collapsed parent.
				if (isFirstCell && isExpandable && !isExpanded) {
					this.setExpanded(row, true);
					this.syncSelection();
					return;
				}

				if (colIndex < rowCells.length - 1) {
					this.focusCell(row, colIndex + 1);
				}
				return;
			}
			case 'ArrowLeft': {
				event.preventDefault();
				// APG cell-only: collapse only from the first cell of an expanded parent.
				if (isFirstCell && isExpandable && isExpanded) {
					this.setExpanded(row, false);
					this.syncSelection();
					return;
				}

				if (colIndex > 0) {
					this.focusCell(row, colIndex - 1);
					return;
				}

				const parent = this.getParentRow(row);
				if (parent) {
					this.focusCell(parent, 0);
				}
				return;
			}
			case 'ArrowDown': {
				event.preventDefault();
				const nextRow = visibleRows[Math.min(visibleRows.length - 1, rowIndex + 1)];
				if (nextRow && nextRow !== row) {
					this.focusCell(nextRow, colIndex);
				}
				return;
			}
			case 'ArrowUp': {
				event.preventDefault();
				const prevRow = visibleRows[Math.max(0, rowIndex - 1)];
				if (prevRow && prevRow !== row) {
					this.focusCell(prevRow, colIndex);
				}
				return;
			}
			case 'Home': {
				event.preventDefault();
				this.focusCell(row, 0);
				return;
			}
			case 'End': {
				event.preventDefault();
				this.focusCell(row, rowCells.length - 1);
				return;
			}
			case '*': {
				event.preventDefault();
				for (const sibling of this.getDataRows()) {
					if (sibling.hasAttribute('aria-expanded')) {
						this.setExpanded(sibling, true);
					}
				}
				this.syncSelection();
				return;
			}
			case 'Enter': {
				event.preventDefault();
				// APG: Enter on the first cell of an expandable row toggles expansion.
				if (isFirstCell && isExpandable) {
					this.setExpanded(row, !isExpanded);
					this.syncSelection();
					return;
				}
				this.activateCell(cell);
				return;
			}
			case ' ': {
				event.preventDefault();
				this.activateCell(cell);
				return;
			}
			default:
				return;
		}
	}

	override render() {
		return (
			<div class="rui-treegrid" role="treegrid" aria-label={this.resolvedAriaLabel}>
				<slot></slot>
			</div>
		);
	}
}
