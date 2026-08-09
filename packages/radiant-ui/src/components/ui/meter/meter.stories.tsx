import { radiantMeta, type StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect } from 'storybook/test';
import { RuiMeter } from './meter';
import { RuiMeter as RuiMeterElement } from './meter.script';

const meta = {
	title: 'Components/Meter',
	component: RuiMeter,
	args: { value: 72, min: 0, max: 100, label: 'Storage used' },
};
radiantMeta(meta, { element: RuiMeterElement, stylesheets: ['./meter.css'] });

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
