import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiSlider } from './slider';

const meta = {
	title: 'Components/Slider',
	component: RuiSlider,
	args: { value: 40, min: 0, max: 100, step: 1, label: 'Volume' },
} satisfies Meta<typeof RuiSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

const getInput = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('rui-slider input[type="range"]') as HTMLInputElement;

const getValueLabel = (canvasElement: HTMLElement) =>
	canvasElement.querySelector('rui-slider .rui-slider__value') as HTMLElement;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-slider') as HTMLElement;
		const input = getInput(canvasElement);

		await step('exposes the current value', async () => {
			await expect(input).toHaveValue('40');
			await expect(getValueLabel(canvasElement)).toHaveTextContent('40');
		});

		await step('changing the range emits rui-change', async () => {
			const emissions: number[] = [];
			host.addEventListener('rui-change', (event) =>
				emissions.push((event as CustomEvent<{ value: number }>).detail.value),
			);
			input.value = '70';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await expect(emissions).toEqual([70]);
			await expect(host).toHaveAttribute('value', '70');
			await expect(getValueLabel(canvasElement)).toHaveTextContent('70');
		});

		await step('pointer drag moves from a low value to a high value', async () => {
			input.value = '10';
			input.dispatchEvent(new Event('input', { bubbles: true }));
			input.dispatchEvent(new Event('change', { bubbles: true }));
			await expect(host).toHaveAttribute('value', '10');

			const rect = input.getBoundingClientRect();
			const midY = rect.top + rect.height / 2;
			const startX = rect.left + rect.width * 0.1;
			const endX = rect.left + rect.width * 0.9;
			const emissions: number[] = [];

			host.addEventListener('rui-change', (event) =>
				emissions.push((event as CustomEvent<{ value: number }>).detail.value),
			);

			input.dispatchEvent(
				new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: startX, clientY: midY }),
			);

			for (const value of [25, 45, 65, 85]) {
				input.value = String(value);
				input.dispatchEvent(new Event('input', { bubbles: true }));
			}

			input.dispatchEvent(
				new PointerEvent('pointerup', { bubbles: true, button: 0, clientX: endX, clientY: midY }),
			);
			input.dispatchEvent(new Event('change', { bubbles: true }));

			const finalValue = Number(input.value);
			await expect(finalValue).toBeGreaterThanOrEqual(80);
			await expect(host).toHaveAttribute('value', String(finalValue));
			await expect(getValueLabel(canvasElement)).toHaveTextContent(String(finalValue));
			await expect(emissions).toContain(85);
			await expect(emissions.at(-1)).toBe(finalValue);

			await userEvent.pointer([
				{ keys: '[MouseLeft>]', target: input, coords: { clientX: startX, clientY: midY } },
				{ coords: { clientX: endX, clientY: midY } },
				{ keys: '[/MouseLeft]' },
			]);

			const pointerValue = Number(input.value);
			await expect(pointerValue).toBeGreaterThanOrEqual(70);
			await expect(host).toHaveAttribute('value', String(pointerValue));
		});
	},
};

export const Disabled: Story = {
	args: { disabled: true },
};

const getRangeThumbs = (canvasElement: HTMLElement) =>
	Array.from(canvasElement.querySelectorAll('rui-slider [data-thumb]')) as HTMLButtonElement[];

export const Range: Story = {
	args: {
		variant: 'range',
		label: 'Price',
		min: 0,
		max: 100,
		step: 1,
		values: [20, 80],
	},
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-slider') as HTMLElement;
		const [minThumb, maxThumb] = getRangeThumbs(canvasElement);

		await step('shows the current range', async () => {
			await expect(host).toHaveAttribute('range-min', '20');
			await expect(host).toHaveAttribute('range-max', '80');
			await expect(getValueLabel(canvasElement)).toHaveTextContent('20 – 80');
		});

		await step('keyboard nudges the minimum thumb', async () => {
			minThumb.focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect(host).toHaveAttribute('range-min', '21');
		});

		await step('keyboard nudges the maximum thumb', async () => {
			maxThumb.focus();
			await userEvent.keyboard('{ArrowLeft}');
			await expect(host).toHaveAttribute('range-max', '79');
		});

		await step('pointer drag moves the minimum thumb', async () => {
			const track = canvasElement.querySelector('.rui-slider__range-track') as HTMLElement;
			const rect = track.getBoundingClientRect();
			const midY = rect.top + rect.height / 2;
			const startX = rect.left + rect.width * 0.2;
			const endX = rect.left + rect.width * 0.35;

			await userEvent.pointer([
				{ keys: '[MouseLeft>]', target: minThumb, coords: { clientX: startX, clientY: midY } },
				{ coords: { clientX: endX, clientY: midY } },
				{ keys: '[/MouseLeft]' },
			]);

			await expect(Number(host.getAttribute('range-min'))).toBeGreaterThan(21);
		});
	},
};

export const RangeMinDistance: Story = {
	args: {
		variant: 'range',
		label: 'Price',
		min: 0,
		max: 100,
		step: 5,
		minDistance: 20,
		values: [30, 60],
	},
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-slider') as HTMLElement;
		const [minThumb] = getRangeThumbs(canvasElement);

		await step('thumbs cannot move closer than minDistance', async () => {
			minThumb.focus();
			for (let index = 0; index < 10; index += 1) {
				await userEvent.keyboard('{ArrowRight}');
			}
			await expect(
				Number(host.getAttribute('range-max')) - Number(host.getAttribute('range-min')),
			).toBeGreaterThanOrEqual(20);
		});
	},
};
