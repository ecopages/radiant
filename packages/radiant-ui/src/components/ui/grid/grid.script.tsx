import { RadiantElement, customElement, onEvent, prop } from '@ecopages/radiant';
import { applyRovingTabindex } from '@/lib/roving-tabindex';

export type RuiGridProps = {
	label?: string;
};

/**
 * `<rui-grid>` — keyboard-navigable grid without selection.
 *
 * The custom element is a behavior host: it does not render cells. Import the
 * script and place light-DOM children that match the contract below, or use
 * `RuiGrid` with a `rows` array or authored children inside the root surface.
 *
 * Row length is taken from the authored markup — do not pass a separate column count.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[role="grid"]` — root surface. The view sets `aria-label`.
 * - `[role="row"]` — row container (direct parent of cells for navigation).
 * - `[role="gridcell"]` — one cell. Host sets roving `tabIndex`.
 *
 * Do not set `tabIndex` on gridcells — the host owns roving focus. Selection is
 * not modeled.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/grid/
 * @element rui-grid
 * @attr {string} label - Accessible name announced when focus enters the grid.
 *
 * @remarks
 * Minimum tree: `[role="grid"]` > `[role="row"]` > `[role="gridcell"]`.
 * BEM classes live on the `RuiGrid` view; the host never queries them.
 */
@customElement('rui-grid')
export class RuiGrid extends RadiantElement {
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
