import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RuiButton } from '../button';
import { RuiSpinner } from './spinner';

const meta = {
	title: 'Components/Spinner',
	component: RuiSpinner,
	parameters: { radiant: { cssImports: ['./spinner.css', '../button/button.css', '../badge/badge.css'] } },
	args: { size: 'md' },
} satisfies Meta<typeof RuiSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
	render: () => (
		<div class="flex items-center gap-4">
			<RuiSpinner size="sm" />
			<RuiSpinner size="md" />
			<RuiSpinner size="lg" />
		</div>
	),
};

export const InButton: Story = {
	render: () => (
		<RuiButton variant="filled" disabled>
			<RuiSpinner size="sm" class="mr-2" />
			Loading...
		</RuiButton>
	),
};
