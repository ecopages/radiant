import { RadiantElement, customElement, onEvent, state } from '@ecopages/radiant';
import {
	RuiTable,
	RuiTableBody,
	RuiTableCell,
	RuiTableColumn,
	RuiTableHeader,
	RuiTableRow,
	type RuiTableSortChangeDetail,
	type RuiTableSortDirection,
} from '@ecopages/radiant-ui/table';

type Plant = { id: string; name: string; sunlight: string; watering: string };

const PLANTS: Plant[] = [
	{ id: 'aloe', name: 'Aloe', sunlight: 'Full sun', watering: 'Minimum' },
	{ id: 'fern', name: 'Maidenhair fern', sunlight: 'Part shade', watering: 'Frequent' },
	{ id: 'ivy', name: 'Ivy', sunlight: 'Part sun', watering: 'Average' },
];

function comparePlants(left: Plant, right: Plant, column: string, direction: RuiTableSortDirection): number {
	const key = column === 'sunlight' ? 'sunlight' : column === 'watering' ? 'watering' : 'name';
	const order = left[key].localeCompare(right[key]);
	return direction === 'descending' ? -order : order;
}

/**
 * Docs-only host that reorders rows after `rui-sort-change`.
 *
 * @remarks The table owns sort state; this demo owns the collection, which is
 * the pattern consumers must follow.
 */
@customElement('rui-table-docs-sort-demo')
class RuiTableDocsSortDemo extends RadiantElement {
	@state sortColumn = 'name';
	@state sortDirection: RuiTableSortDirection = 'ascending';
	@state plants = [...PLANTS].sort((left, right) => comparePlants(left, right, 'name', 'ascending'));

	@onEvent({ selector: 'rui-table', type: 'rui-sort-change' })
	onSortChange(event: CustomEvent<RuiTableSortChangeDetail>): void {
		this.sortColumn = event.detail.column;
		this.sortDirection = event.detail.direction;
		this.plants = [...this.plants].sort((left, right) =>
			comparePlants(left, right, event.detail.column, event.detail.direction),
		);
	}

	override render() {
		return (
			<RuiTable label="Plants" sortColumn={this.sortColumn} sortDirection={this.sortDirection}>
				<RuiTableHeader>
					<RuiTableColumn id="name" allowsSorting isRowHeader>
						Plant
					</RuiTableColumn>
					<RuiTableColumn id="sunlight" allowsSorting>
						Sunlight
					</RuiTableColumn>
					<RuiTableColumn id="watering">Watering</RuiTableColumn>
				</RuiTableHeader>
				<RuiTableBody>
					{this.plants.map((row) => (
						<RuiTableRow id={row.id}>
							<RuiTableCell isRowHeader>{row.name}</RuiTableCell>
							<RuiTableCell>{row.sunlight}</RuiTableCell>
							<RuiTableCell>{row.watering}</RuiTableCell>
						</RuiTableRow>
					))}
				</RuiTableBody>
			</RuiTable>
		);
	}
}

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'rui-table-docs-sort-demo': Record<string, never>;
	}
}