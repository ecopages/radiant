import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import {
	RuiTable,
	RuiTableBody,
	RuiTableCell,
	RuiTableColumn,
	RuiTableHeader,
	RuiTableRow,
	RuiTableSelectionCell,
} from './table';
import { RuiTable as RuiTableElement } from './table.script';
import { RuiCheckbox as RuiCheckboxScript } from '../checkbox/checkbox.script';
void RuiTableElement;
void RuiCheckboxScript;

function mount(element: JsxRenderable): { host: HTMLElement; cleanup: () => void } {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root = createRoot(host);
	root.render(element);
	return {
		host,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

async function settled(): Promise<void> {
	await customElements.whenDefined('rui-table');
	await customElements.whenDefined('rui-checkbox');
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
}

function selectableTable() {
	return (
		<RuiTable label="Plants" selectionMode="multiple">
			<RuiTableHeader>
				<RuiTableSelectionCell scope="all" />
				<RuiTableColumn id="name" isRowHeader>
					Plant
				</RuiTableColumn>
			</RuiTableHeader>
			<RuiTableBody>
				<RuiTableRow id="aloe">
					<RuiTableSelectionCell scope="row" label="Select Aloe" />
					<RuiTableCell isRowHeader>Aloe</RuiTableCell>
				</RuiTableRow>
				<RuiTableRow id="fern">
					<RuiTableSelectionCell scope="row" label="Select Maidenhair fern" />
					<RuiTableCell isRowHeader>Maidenhair fern</RuiTableCell>
				</RuiTableRow>
			</RuiTableBody>
		</RuiTable>
	);
}

function rowCheckboxLabel(root: ParentNode, rowId: string): HTMLElement {
	const label = root.querySelector<HTMLElement>(`[data-table-row="${rowId}"] [data-table-select-row] label`);
	if (!label) {
		throw new Error(`Missing selection checkbox label for row ${rowId}`);
	}
	return label;
}

describe('RuiTable selection checkboxes', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('selects a row when the visible checkbox control is clicked', async () => {
		const { host, cleanup } = mount(selectableTable());
		await settled();

		const table = host.querySelector('rui-table') as RuiTableElement;
		rowCheckboxLabel(host, 'aloe').click();
		await settled();

		expect(table.value).toEqual(['aloe']);
		expect(host.querySelector('[data-table-row="aloe"]')?.getAttribute('aria-selected')).toBe('true');
		expect(
			host.querySelector<HTMLInputElement>('[data-table-row="aloe"] [data-table-select-row] input')?.checked,
		).toBe(true);
		cleanup();
	});

	it('unselects a selected row when the visible checkbox control is clicked', async () => {
		const { host, cleanup } = mount(selectableTable());
		await settled();

		const table = host.querySelector('rui-table') as RuiTableElement;
		const nameCell = host.querySelector<HTMLElement>(
			'[data-table-row="aloe"] [data-table-cell]:not([data-table-selection-cell])',
		)!;
		nameCell.click();
		await settled();
		expect(table.value).toEqual(['aloe']);

		rowCheckboxLabel(host, 'aloe').click();
		await settled();

		expect(table.value).toEqual([]);
		expect(host.querySelector('[data-table-row="aloe"]')?.getAttribute('aria-selected')).toBe('false');
		expect(
			host.querySelector<HTMLInputElement>('[data-table-row="aloe"] [data-table-select-row] input')?.checked,
		).toBe(false);
		cleanup();
	});
});

describe('RuiTable single selection with Space', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('deselects the selected row when Space is pressed on it', async () => {
		const { host, cleanup } = mount(
			<RuiTable label="Plants" selectionMode="single">
				<RuiTableHeader>
					<RuiTableColumn id="name" isRowHeader>
						Plant
					</RuiTableColumn>
				</RuiTableHeader>
				<RuiTableBody>
					<RuiTableRow id="r1">
						<RuiTableCell isRowHeader>Aloe</RuiTableCell>
					</RuiTableRow>
					<RuiTableRow id="r2">
						<RuiTableCell isRowHeader>Fern</RuiTableCell>
					</RuiTableRow>
				</RuiTableBody>
			</RuiTable>,
		);
		await settled();

		const table = host.querySelector('rui-table') as RuiTableElement;
		const changes: string[][] = [];
		table.addEventListener('rui-change', (event) => changes.push((event as CustomEvent).detail.value));
		const cell = host.querySelector<HTMLElement>('[data-table-row="r1"] [data-table-cell]')!;
		const space = () => cell.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

		space();
		await settled();
		expect(table.value).toEqual(['r1']);
		expect(host.querySelector('[data-table-row="r1"]')?.getAttribute('aria-selected')).toBe('true');

		space();
		await settled();
		expect(table.value).toEqual([]);
		expect(host.querySelector('[data-table-row="r1"]')?.getAttribute('aria-selected')).toBe('false');
		expect(changes).toEqual([['r1'], []]);

		cleanup();
	});

	it('keeps one tab stop on the cell the keyboard moved to, and on the same position after a re-render', async () => {
		const { host, cleanup } = mount(selectableTable());
		await settled();

		const rowCells = (id: string) =>
			Array.from(host.querySelectorAll<HTMLElement>(`[data-table-row="${id}"] [data-table-cell]`));
		const stops = () =>
			Array.from(host.querySelectorAll<HTMLElement>('[data-table-row] [data-table-cell]')).map((c) => c.tabIndex);
		expect(stops()).toEqual([0, -1, -1, -1]);

		const first = rowCells('aloe')[0];
		first.focus();
		first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
		expect(document.activeElement).toBe(rowCells('fern')[0]);
		expect(stops()).toEqual([-1, -1, 0, -1]);

		const fern = host.querySelector('[data-table-row="fern"]') as HTMLElement;
		fern.replaceWith(fern.cloneNode(true));
		await settled();
		expect(stops()).toEqual([-1, -1, 0, -1]);
		cleanup();
	});
});
