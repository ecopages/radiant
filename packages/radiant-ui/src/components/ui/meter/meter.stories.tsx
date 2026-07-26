import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect } from 'storybook/test';
import { RuiMeter } from './meter';

const meta = {
	title: 'Components/Meter',
	component: RuiMeter,
	args: { value: 72, min: 0, max: 100, label: 'Storage used' },
} satisfies Meta<typeof RuiMeter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		await step('renders a native meter with the current value', async () => {
			const meter = canvasElement.querySelector('meter') as HTMLMeterElement;
			await expect(meter).toBeInTheDocument();
			await expect(meter.value).toBe(72);
		});
	},
};
