import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect } from 'storybook/test';
import { RuiSeparator, type RuiSeparatorOrientation } from './separator';

type SeparatorStoryArgs = { orientation?: RuiSeparatorOrientation };

function SeparatorPreview({ orientation = 'horizontal' }: SeparatorStoryArgs) {
	const vertical = orientation === 'vertical';
	return (
		<div class={vertical ? 'flex h-12 items-center gap-4' : 'flex flex-col gap-3'}>
			<span>Start</span>
			<RuiSeparator orientation={orientation} />
			<span>End</span>
		</div>
	);
}

const meta = {
	title: 'Components/Separator',
	component: RuiSeparator,
	parameters: { radiant: { cssImports: ['./separator.css'] } },
	args: { orientation: 'horizontal' },
	render: (args) => <SeparatorPreview orientation={args.orientation} />,
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
