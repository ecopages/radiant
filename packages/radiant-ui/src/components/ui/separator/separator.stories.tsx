import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect } from 'storybook/test';
import { RuiSeparator, type RuiSeparatorOrientation } from './separator';

type SeparatorStoryArgs = { orientation?: RuiSeparatorOrientation };

const meta = {
	title: 'Components/Separator',
	component: RuiSeparator,
	parameters: { radiant: { cssImports: ['./separator.css'] } },
	args: { orientation: 'horizontal' },
	render: (args) => (
		<div class="flex h-16 w-64 items-center gap-4 rounded-container border border-border bg-surface p-4">
			<span>Start</span>
			<RuiSeparator orientation={args.orientation} />
			<span>End</span>
		</div>
	),
} satisfies Meta<SeparatorStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
	play: async ({ canvasElement }) => {
		const separator = canvasElement.querySelector('[role="separator"]') as HTMLElement;
		await expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
		await expect(separator).not.toHaveAttribute('tabindex');
	},
};

export const Vertical: Story = {
	args: { orientation: 'vertical' },
	play: async ({ canvasElement }) => {
		await expect(canvasElement.querySelector('[role="separator"]')).toHaveAttribute('aria-orientation', 'vertical');
	},
};
