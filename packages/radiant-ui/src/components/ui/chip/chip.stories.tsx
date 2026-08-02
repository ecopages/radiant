import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RuiChip } from './chip';

const meta = {
	title: 'Components/Chip',
	component: RuiChip,
	args: {
		children: 'Mexican',
	},
} satisfies Meta<typeof RuiChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
	render: () => (
		<div class="flex flex-wrap gap-inline">
			<RuiChip>Default</RuiChip>
			<RuiChip variant="muted">Muted</RuiChip>
			<RuiChip variant="primary">Primary</RuiChip>
		</div>
	),
};
