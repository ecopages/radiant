import {
	RuiTable,
	RuiTableBody,
	RuiTableCell,
	RuiTableColumn,
	RuiTableHeader,
	RuiTableRow,
	RuiTableSelectionCell,
} from '@ecopages/radiant-ui/table';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type TableArgs = {
	label: string;
	selectionMode: 'none' | 'single' | 'multiple';
};

const rows = [
	{ id: 'aloe', name: 'Aloe', sunlight: 'Full sun', watering: 'Minimum' },
	{ id: 'fern', name: 'Maidenhair fern', sunlight: 'Part shade', watering: 'Frequent' },
	{ id: 'ivy', name: 'Ivy', sunlight: 'Part sun', watering: 'Average' },
];

export const meta = {
	args: {
		label: 'Plants',
		selectionMode: 'none',
	},
	argTypes: {
		label: { control: { type: 'text' } },
		selectionMode: {
			control: { type: 'radio' },
			options: ['none', 'single', 'multiple'] as const satisfies readonly TableArgs['selectionMode'][],
		},
	},
	render: (args) => (
		<RuiTable label={args.label} selectionMode={args.selectionMode}>
			<RuiTableHeader>
				{args.selectionMode !== 'none' ? <RuiTableSelectionCell scope="all" /> : null}
				<RuiTableColumn id="name" isRowHeader>
					Plant
				</RuiTableColumn>
				<RuiTableColumn id="sunlight">Sunlight</RuiTableColumn>
				<RuiTableColumn id="watering">Watering</RuiTableColumn>
			</RuiTableHeader>
			<RuiTableBody>
				{rows.map((row) => (
					<RuiTableRow id={row.id}>
						{args.selectionMode !== 'none' ? (
							<RuiTableSelectionCell scope="row" label={`Select ${row.name}`} />
						) : null}
						<RuiTableCell isRowHeader>{row.name}</RuiTableCell>
						<RuiTableCell>{row.sunlight}</RuiTableCell>
						<RuiTableCell>{row.watering}</RuiTableCell>
					</RuiTableRow>
				))}
			</RuiTableBody>
		</RuiTable>
	),
} satisfies DocsMeta<TableArgs>;

type Story = DocsStory<TableArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'table/default' } } });

export const MultipleSelection: Story = docsStory(meta, {
	args: { selectionMode: 'multiple' },
	parameters: { docs: { id: 'table/multiple' } },
});
