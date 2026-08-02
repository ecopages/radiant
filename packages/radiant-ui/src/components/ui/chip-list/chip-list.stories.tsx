import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RuiChip } from '../chip/chip';
import { RuiChipList, RuiChipListItem } from './chip-list';

const meta = {
	title: 'Components/Chip list',
	component: RuiChipList,
} satisfies Meta<typeof RuiChipList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<RuiChipList aria-label="Cuisine">
			<RuiChipListItem>
				<RuiChip>Mexican</RuiChip>
			</RuiChipListItem>
			<RuiChipListItem>
				<RuiChip>Tacos</RuiChip>
			</RuiChipListItem>
			<RuiChipListItem>
				<RuiChip variant="muted">San Dimas</RuiChip>
			</RuiChipListItem>
		</RuiChipList>
	),
};
