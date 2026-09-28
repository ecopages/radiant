import { RuiChip } from '@ecopages/radiant-ui/chip';
import { RuiChipList, RuiChipListItem } from '@ecopages/radiant-ui/chip-list';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type ChipListArgs = {
	'aria-label': string;
};

export const meta = {
	args: {
		'aria-label': 'Topics',
	},
	argTypes: {
		'aria-label': { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiChipList aria-label={args['aria-label']}>
			<RuiChipListItem>
				<RuiChip>React</RuiChip>
			</RuiChipListItem>
			<RuiChipListItem>
				<RuiChip>TypeScript</RuiChip>
			</RuiChipListItem>
		</RuiChipList>
	),
} satisfies DocsMeta<ChipListArgs>;

type Story = DocsStory<ChipListArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'chip-list/default' } } });
