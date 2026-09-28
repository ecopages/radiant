import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, waitFor } from 'storybook/test';
import { RuiMeter } from './meter';
import { RuiMeter as RuiMeterElement } from './meter.script';

const meta = {
	title: 'Components/Meter',
	component: RuiMeter,
	parameters: { radiant: { element: RuiMeterElement, cssImports: ['./meter.css'] } },
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
			const track = canvasElement.querySelector('.rui-meter__track') as HTMLElement;
			const fill = canvasElement.querySelector('.rui-meter__fill') as HTMLElement;
			await expect(track.getAttribute('aria-hidden')).toBe('true');
			await waitFor(() => expect(track.style.getPropertyValue('--rui-meter-percent')).toBe('72%'));
			await expect(Math.round(fill.getBoundingClientRect().width)).toBe(
				Math.round(track.getBoundingClientRect().width * 0.72),
			);
		});
		await step('updates the visual fill with the native value', async () => {
			const host = canvasElement.querySelector('rui-meter') as RuiMeterElement;
			const meter = host.querySelector('meter') as HTMLMeterElement;
			const track = host.querySelector('.rui-meter__track') as HTMLElement;
			host.value = 25;
			await waitFor(() => expect(meter.value).toBe(25));
			await waitFor(() => expect(track.style.getPropertyValue('--rui-meter-percent')).toBe('25%'));
		});
		await step('clamps the fill and readout to the range', async () => {
			const host = canvasElement.querySelector('rui-meter') as RuiMeterElement;
			const track = host.querySelector('.rui-meter__track') as HTMLElement;
			const readout = host.querySelector('.rui-meter__value') as HTMLElement;
			host.value = 120;
			await waitFor(() => expect(readout.textContent?.trim()).toBe('100%'));
			await expect(track.style.getPropertyValue('--rui-meter-percent')).toBe('100%');
			host.value = -20;
			await waitFor(() => expect(readout.textContent?.trim()).toBe('0%'));
			await expect(track.style.getPropertyValue('--rui-meter-percent')).toBe('0%');
		});
	},
};
