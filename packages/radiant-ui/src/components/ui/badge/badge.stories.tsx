import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RuiSpinner } from '../spinner';
import { RuiBadge } from './badge';

const meta = {
	title: 'Components/Badge',
	component: RuiBadge,
	parameters: { radiant: { cssImports: ['./badge.css', '../spinner/spinner.css'] } },
	args: { variant: 'filled', children: 'Badge' },
} satisfies Meta<typeof RuiBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
	render: () => (
		<div class="flex flex-wrap gap-2">
			<RuiBadge variant="filled">Filled</RuiBadge>
			<RuiBadge variant="outline">Outline</RuiBadge>
			<RuiBadge variant="destructive">Destructive</RuiBadge>
			<RuiBadge variant="ghost">Ghost</RuiBadge>
			<RuiBadge variant="muted">Muted</RuiBadge>
		</div>
	),
};

export const WithSpinner: Story = {
	render: () => (
		<RuiBadge variant="outline">
			<RuiSpinner size="sm" />
			Syncing
		</RuiBadge>
	),
};
