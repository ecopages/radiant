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
import type { RuiTable as RuiTableElement } from './table.script';
import './table.script';
import '../checkbox/checkbox.script';

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
