import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RuiHeadline } from './headline';

const meta = {
	title: 'Components/Headline',
	component: RuiHeadline,
	parameters: { radiant: { cssImports: ['./headline.css'] } },
	args: {
		children: 'Display title',
	},
} satisfies Meta<typeof RuiHeadline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
	render: () => (
		<div class="flex flex-col gap-stack">
			<RuiHeadline size="sm">Small headline</RuiHeadline>
			<RuiHeadline size="md">Medium headline</RuiHeadline>
			<RuiHeadline size="lg">Large headline</RuiHeadline>
			<RuiHeadline size="xl">Extra large headline</RuiHeadline>
		</div>
	),
};

export const HeadingLevels: Story = {
	render: () => (
		<div class="flex flex-col gap-stack">
			<RuiHeadline as="h1" size="lg">
				Page title (h1)
			</RuiHeadline>
			<RuiHeadline as="h2">Section title (h2)</RuiHeadline>
			<RuiHeadline as="h3" size="sm">
				Subsection (h3)
			</RuiHeadline>
		</div>
	),
};
