import { afterEach, describe, expect, it, vi } from 'vitest';
import '@ecopages/jsx/jsx-dev-runtime';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { RadiantElement, customElement, state } from '@ecopages/radiant';
import { RuiButton } from '../button';
import { RuiDialog, RuiDialogBody, RuiDialogClose, RuiDialogTitle } from '../dialog';
import { RuiPopover, RuiPopoverContent, RuiPopoverTrigger } from '../popover';
import {
	RuiTable,
	RuiTableBody,
	RuiTableCell,
	RuiTableColumn,
	RuiTableEmptyState,
	RuiTableHeader,
	RuiTableRow,
} from './table';
import './table.script';

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
	await Promise.resolve();
	await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
	await customElements.whenDefined('rui-table');
	await new Promise<void>((resolve) => queueMicrotask(() => resolve()));
}

function collectRangeDriftWarnings() {
	const warnings: string[] = [];
	const spy = vi.spyOn(console, 'warn').mockImplementation((message) => {
		if (String(message).includes('mutated outside Radiant JSX control')) {
			warnings.push(String(message));
		}
	});
	return {
		warnings,
		restore: () => spy.mockRestore(),
	};
}

@customElement('test-table-range-host')
class TestTableRangeHost extends RadiantElement {
	@state rows = ['aloe', 'fern', 'ivy'];
	@state loading = false;
	@state busy = false;
	@state sortColumn = 'name';
	@state dialogOpen = false;

	override render() {
		return (
			<div class="test-table-range-host">
				<RuiPopoverTrigger trigger={<RuiButton variant="outline">Filters</RuiButton>}>
					<RuiPopover placement="bottom-end" portal={false}>
						<RuiPopoverContent>Filter panel</RuiPopoverContent>
					</RuiPopover>
				</RuiPopoverTrigger>
				<RuiTable
					label="Plants"
					sortColumn={this.sortColumn}
					sortDirection="ascending"
					aria-busy={this.busy ? 'true' : undefined}
				>
					<RuiTableHeader>
						<RuiTableColumn id="name" allowsSorting isRowHeader>
							Plant
						</RuiTableColumn>
					</RuiTableHeader>
					<RuiTableBody>
						{this.loading || this.rows.length === 0 ? (
							<RuiTableEmptyState key="table-body" colSpan={1}>
								{this.loading ? 'Loading…' : 'No plants'}
							</RuiTableEmptyState>
						) : (
							this.rows.map((id) => (
								<RuiTableRow key={id} id={id}>
									<RuiTableCell isRowHeader>{id}</RuiTableCell>
								</RuiTableRow>
							))
						)}
					</RuiTableBody>
				</RuiTable>
				{this.dialogOpen ? (
					<RuiDialog id="test-dialog" open>
						<RuiDialogClose />
						<RuiDialogTitle>Edit plant</RuiDialogTitle>
						<RuiDialogBody>Dialog body</RuiDialogBody>
					</RuiDialog>
				) : null}
			</div>
		);
	}
}

describe('RuiTable range ownership', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('does not emit dom-range-anchor-drift warnings when parent JSX reconciles rows', async () => {
		const { host, cleanup } = mount(<test-table-range-host />);
		await settled();

		const demo = host.querySelector('test-table-range-host') as TestTableRangeHost;
		const tracker = collectRangeDriftWarnings();

		demo.busy = true;
		await settled();

		demo.rows = ['ivy', 'aloe'];
		await settled();

		demo.loading = true;
		await settled();

		demo.loading = false;
		demo.rows = ['fern', 'ivy', 'aloe'];
		await settled();

		demo.sortColumn = 'name';
		await settled();

		demo.dialogOpen = true;
		await settled();

		demo.busy = false;
		demo.dialogOpen = false;
		await settled();

		tracker.restore();
		expect(tracker.warnings).toEqual([]);
		cleanup();
	});

	it('keeps the grid surface in authored JSX rather than a host slot projection', async () => {
		const { host, cleanup } = mount(
			<RuiTable label="Plants">
				<RuiTableHeader>
					<RuiTableColumn id="name" isRowHeader>
						Plant
					</RuiTableColumn>
				</RuiTableHeader>
				<RuiTableBody>
					<RuiTableRow id="aloe">
						<RuiTableCell isRowHeader>Aloe</RuiTableCell>
					</RuiTableRow>
				</RuiTableBody>
			</RuiTable>,
		);
		await settled();

		const table = host.querySelector('rui-table');
		const grid = host.querySelector('.rui-table[role="grid"]');
		expect(table?.querySelector('slot')).toBeNull();
		expect(grid).not.toBeNull();
		expect(grid?.parentElement).toBe(table);
		cleanup();
	});
});

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'test-table-range-host': Record<string, never>;
	}
}
