import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiWindowSplitter } from './window-splitter';

const meta = {
	title: 'Components/Window Splitter',
	component: RuiWindowSplitter,
	args: {
		value: 40,
		orientation: 'horizontal',
		label: 'Resize panes',
		primary: <p>Primary pane</p>,
		secondary: <p>Secondary pane</p>,
	},
} satisfies Meta<typeof RuiWindowSplitter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const separator = canvasElement.querySelector('[role="separator"]') as HTMLElement;
		const host = canvasElement.querySelector('rui-window-splitter') as HTMLElement;
		await step('ArrowRight increases the primary pane size', async () => {
			separator.focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect(Number(host.getAttribute('value'))).toBeGreaterThan(40);
		});
	},
};
