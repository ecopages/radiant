import {
	RuiTable,
	RuiTableBody,
	RuiTableCell,
	RuiTableColumn,
	RuiTableHeader,
	RuiTableRow,
} from '@ecopages/radiant-ui/table';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type TableArgs = {
	label: string;
};

const rows = [
	{ id: 'aloe', name: 'Aloe', sunlight: 'Full sun', watering: 'Minimum' },
	{ id: 'fern', name: 'Maidenhair fern', sunlight: 'Part shade', watering: 'Frequent' },
	{ id: 'ivy', name: 'Ivy', sunlight: 'Part sun', watering: 'Average' },
];

export const meta = {
	args: {
		label: 'Plants',
	},
	argTypes: {
		label: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiTable label={args.label}>
			<RuiTableHeader>
				<RuiTableColumn id="name" isRowHeader>
					Plant
				</RuiTableColumn>
				<RuiTableColumn id="sunlight">Sunlight</RuiTableColumn>
				<RuiTableColumn id="watering">Watering</RuiTableColumn>
			</RuiTableHeader>
			<RuiTableBody>
				{rows.map((row) => (
					<RuiTableRow id={row.id}>
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
