import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RuiButton } from '../button/button';
import { RuiButtonGroup } from './button-group';

const meta = {
	title: 'Components/Button group',
	component: RuiButtonGroup,
	parameters: { radiant: { cssImports: ['./button-group.css'] } },
} satisfies Meta<typeof RuiButtonGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
	render: () => (
		<RuiButtonGroup aria-label="Article actions">
			<RuiButton size="sm">Bookmark</RuiButton>
			<RuiButton size="sm" variant="ghost">
				Share
			</RuiButton>
		</RuiButtonGroup>
	),
};

export const Vertical: Story = {
	render: () => (
		<RuiButtonGroup orientation="vertical" aria-label="Form actions">
			<RuiButton>Save</RuiButton>
			<RuiButton variant="outline">Cancel</RuiButton>
			<RuiButton variant="ghost">Reset</RuiButton>
		</RuiButtonGroup>
	),
};
