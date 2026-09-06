import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RadiantElement, customElement, onEvent, state } from '@ecopages/radiant';
import { expect, spyOn, userEvent, waitFor } from 'storybook/test';
import { applyDesignTokens } from '../../../../.storybook/apply-design-tokens';
import type { ViewMultiValue } from '../shared/multi-value';
import {
	RuiTable,
	RuiTableBody,
	RuiTableCell,
	RuiTableColumn,
	RuiTableEmptyState,
	RuiTableHeader,
	RuiTableRow,
	RuiTableSelectionCell,
} from './table';
import {
	RuiTable as RuiTableElement,
	type RuiTableSelectionMode,
	type RuiTableSortChangeDetail,
	type RuiTableSortDirection,
} from './table.script';

function watchRangeDriftWarnings() {
	const warnings: string[] = [];
	const spy = spyOn(console, 'warn').mockImplementation((message) => {
		if (String(message).includes('mutated outside Radiant JSX control')) {
			warnings.push(String(message));
		}
	});
	return {
		assertClean: () => expect(warnings).toEqual([]),
		restore: () => spy.mockRestore(),
	};
}

const rows = [
	{ id: 'aloe', name: 'Aloe', sunlight: 'Full sun', watering: 'Minimum' },
	{ id: 'fern', name: 'Maidenhair fern', sunlight: 'Part shade', watering: 'Frequent' },
	{ id: 'ivy', name: 'Ivy', sunlight: 'Part sun', watering: 'Average' },
];

function PlantTable({
	selectionMode = 'none',
	value = '',
	sortColumn = '',
	sortDirection = 'ascending',
	allowsSorting = false,
	plants = rows,
}: {
	selectionMode?: RuiTableSelectionMode;
	value?: ViewMultiValue;
	sortColumn?: string;
	sortDirection?: 'ascending' | 'descending';
	allowsSorting?: boolean;
	plants?: typeof rows;
}) {
	return (
		<RuiTable
			label="Plants"
			selectionMode={selectionMode}
			value={value}
			sortColumn={sortColumn}
			sortDirection={sortDirection}
		>
			<RuiTableHeader>
				{selectionMode !== 'none' ? <RuiTableSelectionCell scope="all" /> : null}
				<RuiTableColumn id="name" allowsSorting={allowsSorting} isRowHeader>
					Plant
				</RuiTableColumn>
				<RuiTableColumn id="sunlight" allowsSorting={allowsSorting}>
					Sunlight
				</RuiTableColumn>
				<RuiTableColumn id="watering">Watering</RuiTableColumn>
			</RuiTableHeader>
			<RuiTableBody>
				{plants.map((row) => (
					<RuiTableRow id={row.id} actionable={row.id === 'ivy'}>
						{selectionMode !== 'none' ? (
							<RuiTableSelectionCell scope="row" label={`Select ${row.name}`} />
						) : null}
						<RuiTableCell isRowHeader>{row.name}</RuiTableCell>
						<RuiTableCell>{row.sunlight}</RuiTableCell>
						<RuiTableCell>{row.watering}</RuiTableCell>
					</RuiTableRow>
				))}
			</RuiTableBody>
		</RuiTable>
	);
}

function comparePlantColumn(
	left: (typeof rows)[number],
	right: (typeof rows)[number],
	column: string,
	direction: RuiTableSortDirection,
): number {
	const key = column === 'sunlight' ? 'sunlight' : column === 'watering' ? 'watering' : 'name';
	const order = left[key].localeCompare(right[key]);
	return direction === 'descending' ? -order : order;
}

@customElement('rui-table-sort-demo')
export class RuiTableSortDemo extends RadiantElement {
	@state sortColumn = 'name';
	@state sortDirection: RuiTableSortDirection = 'ascending';
	@state plants = [...rows].sort((left, right) => comparePlantColumn(left, right, 'name', 'ascending'));

	@onEvent({ selector: 'rui-table', type: 'rui-sort-change' })
	onSortChange(event: CustomEvent<RuiTableSortChangeDetail>): void {
		this.sortColumn = event.detail.column;
		this.sortDirection = event.detail.direction;
		this.plants = [...this.plants].sort((left, right) =>
			comparePlantColumn(left, right, event.detail.column, event.detail.direction),
		);
	}

	override render() {
		return (
			<PlantTable
				allowsSorting
				sortColumn={this.sortColumn}
				sortDirection={this.sortDirection}
				plants={this.plants}
			/>
		);
	}
}

const meta = {
	title: 'Components/Table',
	component: RuiTable,
	parameters: { radiant: { element: RuiTableElement, cssImports: ['../checkbox/checkbox.css', './table.css'] } },
} satisfies Meta<typeof RuiTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => <PlantTable />,
	play: async ({ canvasElement, step }) => {
		await step('renders the composed grid semantics', async () => {
			const table = canvasElement.querySelector('[role="grid"]');
			await expect(table).toHaveAttribute('aria-label', 'Plants');
			await expect(canvasElement.querySelectorAll('[role="columnheader"]')).toHaveLength(3);
			await expect(canvasElement.querySelectorAll('[data-table-row]')).toHaveLength(3);
		});
	},
};

export const KeyboardNavigation: Story = {
	render: () => <PlantTable />,
	play: async ({ canvasElement, step }) => {
		const cells = Array.from(canvasElement.querySelectorAll('[data-table-row] [data-table-cell]')) as HTMLElement[];
		await step('arrow keys and Home navigate the current row and column', async () => {
			cells[0].focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect(document.activeElement).toBe(cells[1]);
			await userEvent.keyboard('{ArrowDown}');
			await expect(document.activeElement).toBe(cells[4]);
			await userEvent.keyboard('{Home}');
			await expect(document.activeElement).toBe(cells[3]);
		});
	},
};

export const MultipleSelection: Story = {
	render: () => <PlantTable selectionMode="multiple" />,
	play: async ({ canvasElement, step }) => {
		const table = canvasElement.querySelector('rui-table') as HTMLElement & { value: string[] };
		const rowCheckboxes = Array.from(canvasElement.querySelectorAll('rui-checkbox[data-table-select-row]'));

		await step('Radiant row checkbox updates the serialized selected value', async () => {
			await expect(rowCheckboxes[0]).toBeInstanceOf(HTMLElement);
			await userEvent.click(canvasElement.querySelector('[data-table-select-row] label')!);
			await expect(table).toHaveAttribute('value', 'aloe');
			await expect(canvasElement.querySelector('[data-table-row="aloe"]')).toHaveAttribute(
				'aria-selected',
				'true',
			);
		});

		await step('clicking the same checkbox again unselects the row', async () => {
			await userEvent.click(canvasElement.querySelector('[data-table-select-row] label')!);
			await expect(table).not.toHaveAttribute('value');
			await expect(canvasElement.querySelector('[data-table-row="aloe"]')).toHaveAttribute(
				'aria-selected',
				'false',
			);
		});

		await step('Radiant select-all checkbox checks every selectable row', async () => {
			await userEvent.click(canvasElement.querySelector('[data-table-select-all] label')!);
			await expect([...table.value].sort()).toEqual(['aloe', 'fern', 'ivy']);
			await expect(canvasElement.querySelector<HTMLInputElement>('[data-table-select-all] input')).toBeChecked();
		});
	},
};

export const Sorting: Story = {
	render: () => <rui-table-sort-demo />,
	play: async ({ canvasElement, step }) => {
		const drift = watchRangeDriftWarnings();
		const sortEvents: Array<{ column: string; direction: string }> = [];
		canvasElement.addEventListener('rui-sort-change', (event) => {
			sortEvents.push((event as CustomEvent<{ column: string; direction: string }>).detail);
		});

		try {
			await step('sortable column toggles its direction and reorders the collection', async () => {
				await waitFor(() => expect(canvasElement.querySelector('[data-table-sort="name"]')).toBeTruthy());
				await userEvent.click(canvasElement.querySelector<HTMLButtonElement>('[data-table-sort="name"]')!);
				await expect(canvasElement.querySelector('[data-table-column="name"]')).toHaveAttribute(
					'aria-sort',
					'descending',
				);
				await expect(sortEvents).toEqual([{ column: 'name', direction: 'descending' }]);
				await waitFor(() =>
					expect(
						Array.from(canvasElement.querySelectorAll('[data-table-row]')).map((row) =>
							row.getAttribute('data-table-row'),
						),
					).toEqual(['fern', 'ivy', 'aloe']),
				);
			});
		} finally {
			drift.assertClean();
			drift.restore();
		}
	},
};

export const Empty: Story = {
	render: () => (
		<RuiTable label="Empty plants">
			<RuiTableHeader>
				<RuiTableColumn id="name" isRowHeader>
					Plant
				</RuiTableColumn>
				<RuiTableColumn id="cycle">Cycle</RuiTableColumn>
				<RuiTableColumn id="watering">Watering</RuiTableColumn>
			</RuiTableHeader>
			<RuiTableBody>
				<RuiTableEmptyState colSpan={3}>No plants match the active filters.</RuiTableEmptyState>
			</RuiTableBody>
		</RuiTable>
	),
	play: async ({ canvasElement, step }) => {
		await step('renders an announced full-width empty cell', async () => {
			const table = canvasElement.querySelector('.rui-table') as HTMLElement;
			const message = canvasElement.querySelector('.rui-table__empty-state-message') as HTMLElement;
			await expect(canvasElement.querySelector('.rui-table__empty-state')).toHaveAttribute('aria-colspan', '3');
			await expect(
				Math.abs(message.getBoundingClientRect().width - table.getBoundingClientRect().width),
			).toBeLessThan(2);
		});
	},
};

export const RowAction: Story = {
	render: () => <PlantTable />,
	play: async ({ canvasElement, step }) => {
		const table = canvasElement.querySelector('rui-table') as HTMLElement;
		const actions: string[] = [];
		table.addEventListener('rui-row-action', (event) => {
			actions.push((event as CustomEvent<{ rowId: string }>).detail.rowId);
		});

		await step('Enter activates an actionable row', async () => {
			const target = canvasElement.querySelector<HTMLElement>('[data-table-row="ivy"] [data-table-cell]')!;
			target.focus();
			await userEvent.keyboard('{Enter}');
			await expect(actions).toEqual(['ivy']);
		});
	},
};

export const InteractiveCell: Story = {
	render: () => (
		<RuiTable label="Actions" selectionMode="single">
			<RuiTableHeader>
				<RuiTableColumn id="name" isRowHeader>
					Plant
				</RuiTableColumn>
				<RuiTableColumn id="actions">Actions</RuiTableColumn>
			</RuiTableHeader>
			<RuiTableBody>
				<RuiTableRow id="aloe">
					<RuiTableCell isRowHeader>Aloe</RuiTableCell>
					<RuiTableCell>
						<button type="button" data-row-control>
							Inspect
						</button>
					</RuiTableCell>
				</RuiTableRow>
			</RuiTableBody>
		</RuiTable>
	),
	play: async ({ canvasElement, step }) => {
		await step('nested controls do not select their row', async () => {
			await userEvent.click(canvasElement.querySelector<HTMLButtonElement>('[data-row-control]')!);
			await expect(canvasElement.querySelector('rui-table')).not.toHaveAttribute('value');
		});
	},
};

export const DesignTokens: Story = {
	render: () => <PlantTable />,
	play: async ({ canvasElement, step }) => {
		const table = canvasElement.querySelector('rui-table')!;
		const cell = canvasElement.querySelector<HTMLElement>('[data-table-row] [data-table-cell]')!;

		try {
			await step('compact spacing and sharp radius update the table surface', async () => {
				applyDesignTokens({ ruiSpacing: 'compact', ruiRadius: 'sharp' });
				await waitFor(() => expect(getComputedStyle(cell).paddingTop).toBe('4px'));
				await waitFor(() => expect(getComputedStyle(table).borderTopLeftRadius).toBe('0px'));
			});

			await step('wide spacing and soft radius update the table surface', async () => {
				applyDesignTokens({ ruiSpacing: 'wide', ruiRadius: 'soft' });
				await waitFor(() => expect(getComputedStyle(cell).paddingTop).toBe('14px'));
				await waitFor(() => expect(getComputedStyle(table).borderTopLeftRadius).toBe('16px'));
			});
		} finally {
			applyDesignTokens({});
		}
	},
};

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'rui-table-sort-demo': Record<string, never>;
	}
}
