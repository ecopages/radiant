import { RadiantElement, customElement, onEvent, prop } from '@ecopages/radiant';
import { applyRovingTabindex } from '@/lib/roving-tabindex';

export type RuiGridProps = {
	label?: string;
};

type RuiGridBindings = {
	label: string;
};

/**
 * `<rui-grid>` — an interactive grid navigated with arrow keys.
 *
 * Implements a simplified APG Grid pattern for layout/data cells with
 * `role="grid"`, `role="row"`, and `role="gridcell"`. Row length is taken from
 * the authored markup — do not pass a separate column count.
 *
 * @summary Keyboard-navigable grid; cells are authored light-DOM markup.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/grid/
 *
 * @element rui-grid
 *
 * @attr {string} label - Accessible name announced when focus enters the grid.
 *
 * @cssclass rui-grid - Root surface (`role="grid"`).
 *
 * @remarks
 * Cells are focused with a roving `tabindex` (arrow keys, Home/End). Selection
 * is not modeled — row and cell classes live on the `RuiGrid` view.
 */
@customElement('rui-grid')
export class RuiGrid extends RadiantElement<RuiGridBindings> {
	@prop({ type: String, defaultValue: '' }) label: string;

	protected override onConnected(): void {
		const cells = Array.from(this.querySelectorAll<HTMLElement>('[role="gridcell"]'));
		applyRovingTabindex(cells, 0);
	}

	private getRows(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[role="row"]'));
	}

	@onEvent({ selector: '[role="gridcell"]', type: 'keydown' })
	onKeydown(event: KeyboardEvent): void {
		const rows = this.getRows();
		const current = (event.target as HTMLElement).closest('[role="gridcell"]') as HTMLElement | null;
		if (!current) return;

		const row = current.parentElement as HTMLElement;
		const rowIndex = rows.indexOf(row);
		const cells = Array.from(row.querySelectorAll<HTMLElement>('[role="gridcell"]'));
		const colIndex = cells.indexOf(current);

		let nextRow = rowIndex;
		let nextCol = colIndex;

		switch (event.key) {
			case 'ArrowRight':
				nextCol = Math.min(cells.length - 1, colIndex + 1);
				break;
			case 'ArrowLeft':
				nextCol = Math.max(0, colIndex - 1);
				break;
			case 'ArrowDown':
				nextRow = Math.min(rows.length - 1, rowIndex + 1);
				break;
			case 'ArrowUp':
				nextRow = Math.max(0, rowIndex - 1);
				break;
			case 'Home':
				nextCol = 0;
				break;
			case 'End':
				nextCol = cells.length - 1;
				break;
			default:
				return;
		}

		event.preventDefault();
		const targetRow = rows[nextRow];
		const targetCells = Array.from(targetRow.querySelectorAll<HTMLElement>('[role="gridcell"]'));
		const target = targetCells[Math.min(nextCol, targetCells.length - 1)];
		const allCells = Array.from(this.querySelectorAll<HTMLElement>('[role="gridcell"]'));
		applyRovingTabindex(allCells, allCells.indexOf(target));
		target.focus();
	}
}
