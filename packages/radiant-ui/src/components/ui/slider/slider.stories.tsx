import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiField, RuiFieldDescription, RuiFieldError } from '../field';
import { RuiLabel } from '../label';
import { RuiSlider } from './slider';
import { RuiSlider as RuiSliderElement } from './slider.script';

const meta = {
	title: 'Components/Slider',
	component: RuiSlider,
	parameters: { radiant: { element: RuiSliderElement, cssImports: ['./slider.css', '../field/field.css'] } },
	args: { value: 21, min: 0, max: 100, step: 1, label: 'Opacity', showValue: true },
} satisfies Meta<typeof RuiSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

const getHiddenInput = (root: HTMLElement) => root.querySelector('rui-slider input[type="hidden"]') as HTMLInputElement;

const getSingleThumb = (root: HTMLElement) =>
	root.querySelector('rui-slider [data-thumb="value"]') as HTMLButtonElement;

const getValueLabel = (root: HTMLElement) => root.querySelector('rui-slider .rui-slider__value') as HTMLElement;

export const Default: Story = {
	play: async ({ canvasElement: root, step }) => {
		const host = root.querySelector('rui-slider') as HTMLElement;
		const input = getHiddenInput(root);
		const thumb = getSingleThumb(root);

		await step('exposes the current value', async () => {
			await expect(input).toHaveValue('21');
			await expect(getValueLabel(root)).toHaveTextContent('21');
		});

		await step('keyboard nudges the thumb', async () => {
			thumb.focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect(host).toHaveAttribute('value', '22');
			await expect(getValueLabel(root)).toHaveTextContent('22');
		});

		await step('pointer drag moves the thumb', async () => {
			const track = root.querySelector('.rui-slider__range-track') as HTMLElement;
			const rect = track.getBoundingClientRect();
			const midY = rect.top + rect.height / 2;
			const startX = rect.left + rect.width * 0.1;
			const endX = rect.left + rect.width * 0.9;
			const emissions: number[] = [];

			host.addEventListener('rui-change', (event) =>
				emissions.push((event as CustomEvent<{ value: number }>).detail.value),
			);

			thumb.focus();
			await expect(thumb).toHaveFocus();

			await userEvent.pointer([
				{ keys: '[MouseLeft>]', target: thumb, coords: { clientX: startX, clientY: midY } },
				{ coords: { clientX: endX, clientY: midY } },
				{ keys: '[/MouseLeft]' },
			]);

			await expect(thumb).toHaveFocus();
			await expect(Number(host.getAttribute('value'))).toBeGreaterThan(22);
			await expect(emissions.length).toBeGreaterThan(0);
		});

		await step('switches between single and range presentation without replacing its view', async () => {
			const slider = host as unknown as RuiSliderElement;
			slider.showValue = false;
			await expect(getValueLabel(root)).toHaveAttribute('hidden');
			slider.showValue = true;
			await expect(getValueLabel(root)).not.toHaveAttribute('hidden');

			slider.variant = 'range';
			const [minThumb, maxThumb] = getRangeThumbs(root);

			await expect(getSingleThumb(root)).toHaveAttribute('hidden');
			await expect(minThumb).not.toHaveAttribute('hidden');
			await expect(maxThumb).not.toHaveAttribute('hidden');
		});
	},
};

export const Disabled: Story = {
	args: { disabled: true },
};

export const Vertical: Story = {
	args: {
		orientation: 'vertical',
		value: 40,
		label: 'Volume',
		showValue: true,
	},
	render: (args) => (
		<div style={{ height: '12rem' }}>
			<RuiSlider {...args} />
		</div>
	),
	play: async ({ canvasElement: root, step }) => {
		const host = root.querySelector('rui-slider') as HTMLElement;
		const thumb = getSingleThumb(root);

		await step('renders a vertical track', async () => {
			await expect(host.querySelector('.rui-slider--vertical')).toBeTruthy();
			await expect(thumb).toHaveAttribute('aria-orientation', 'vertical');
		});

		await step('pointer drag moves the value upward', async () => {
			const track = root.querySelector('.rui-slider__range-track') as HTMLElement;
			const rect = track.getBoundingClientRect();
			const midX = rect.left + rect.width / 2;
			const startY = rect.bottom - rect.height * 0.1;
			const endY = rect.top + rect.height * 0.1;

			thumb.focus();
			await userEvent.pointer([
				{ keys: '[MouseLeft>]', target: thumb, coords: { clientX: midX, clientY: startY } },
				{ coords: { clientX: midX, clientY: endY } },
				{ keys: '[/MouseLeft]' },
			]);

			await expect(Number(host.getAttribute('value'))).toBeGreaterThan(40);
		});
	},
};

const getRangeThumbs = (root: HTMLElement) =>
	Array.from(
		root.querySelectorAll('rui-slider [data-thumb="min"], rui-slider [data-thumb="max"]'),
	) as HTMLButtonElement[];

export const Range: Story = {
	args: {
		variant: 'range',
		label: 'Price',
		min: 0,
		max: 100,
		step: 1,
		values: [20, 80],
		showValue: true,
	},
	play: async ({ canvasElement: root, step }) => {
		const host = root.querySelector('rui-slider') as HTMLElement;
		const [minThumb, maxThumb] = getRangeThumbs(root);

		await step('shows the current range', async () => {
			await expect(host).toHaveAttribute('range-min', '20');
			await expect(host).toHaveAttribute('range-max', '80');
			await expect(getValueLabel(root)).toHaveTextContent('20 – 80');
			await expect(root.querySelector('rui-slider [data-ref="input"]')).toHaveValue('20');
			await expect(root.querySelector('rui-slider [data-ref="maxInput"]')).toHaveValue('80');
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
			const track = root.querySelector('.rui-slider__range-track') as HTMLElement;
			const rect = track.getBoundingClientRect();
			const midY = rect.top + rect.height / 2;
			const startX = rect.left + rect.width * 0.2;
			const endX = rect.left + rect.width * 0.35;

			minThumb.focus();
			await expect(minThumb).toHaveFocus();

			await userEvent.pointer([
				{ keys: '[MouseLeft>]', target: minThumb, coords: { clientX: startX, clientY: midY } },
				{ coords: { clientX: endX, clientY: midY } },
				{ keys: '[/MouseLeft]' },
			]);

			await expect(minThumb).toHaveFocus();
			await expect(Number(host.getAttribute('range-min'))).toBeGreaterThan(21);
		});
	},
};

export const VerticalRange: Story = {
	args: {
		variant: 'range',
		orientation: 'vertical',
		label: 'Price',
		min: 0,
		max: 100,
		step: 1,
		values: [20, 80],
		showValue: true,
	},
	render: (args) => (
		<div style={{ height: '12rem' }}>
			<RuiSlider {...args} />
		</div>
	),
	play: async ({ canvasElement: root, step }) => {
		const host = root.querySelector('rui-slider') as HTMLElement;
		const [minThumb] = getRangeThumbs(root);

		await step('renders a vertical range track', async () => {
			await expect(host.querySelector('.rui-slider--vertical')).toBeTruthy();
		});

		await step('pointer drag moves the minimum thumb upward', async () => {
			const track = root.querySelector('.rui-slider__range-track') as HTMLElement;
			const rect = track.getBoundingClientRect();
			const midX = rect.left + rect.width / 2;
			const startY = rect.bottom - rect.height * 0.2;
			const endY = rect.top + rect.height * 0.35;

			minThumb.focus();
			await userEvent.pointer([
				{ keys: '[MouseLeft>]', target: minThumb, coords: { clientX: midX, clientY: startY } },
				{ coords: { clientX: midX, clientY: endY } },
				{ keys: '[/MouseLeft]' },
			]);

			await expect(Number(host.getAttribute('range-min'))).toBeGreaterThan(20);
		});
	},
};

export const Customized: Story = {
	parameters: {
		radiant: {
			element: RuiSliderElement,
			cssImports: ['./slider.css', '../../../stories/fixtures/slider-custom.css'],
		},
	},
	render: () => (
		<div class="slider-shape-demo">
			<RuiSlider variant="range" min={0} max={100} values={[28, 72]} showValue valueTitle />
		</div>
	),
	play: async ({ canvasElement: root, step }) => {
		await step('styles track and thumb via slider css variables', async () => {
			const track = root.querySelector('.slider-shape-demo .rui-slider__range-track') as HTMLElement;
			const thumb = root.querySelector('.slider-shape-demo .rui-slider__thumb') as HTMLElement;

			await expect(track).toBeTruthy();
			await expect(thumb).toBeTruthy();
			await expect(track.getBoundingClientRect().height).toBeGreaterThan(thumb.getBoundingClientRect().height);
			await expect(getComputedStyle(track).borderRadius).not.toBe('');
			await expect(getComputedStyle(thumb).borderRadius).not.toBe('');
		});

		await step('exposes live value in the control title tooltip', async () => {
			const thumb = root.querySelector('.slider-shape-demo [data-thumb="min"]') as HTMLElement;
			await expect(thumb).toHaveAttribute('title');
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
	play: async ({ canvasElement: root, step }) => {
		const host = root.querySelector('rui-slider') as HTMLElement;
		const [minThumb] = getRangeThumbs(root);

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

export const FractionalStep: Story = {
	args: {
		label: 'Mix',
		min: 0,
		max: 1,
		step: 0.1,
		value: 0.2,
		showValue: true,
	},
	play: async ({ canvasElement: root, step }) => {
		const host = root.querySelector('rui-slider') as HTMLElement;
		const thumb = getSingleThumb(root);

		await step('keeps fractional steps free of binary float noise', async () => {
			thumb.focus();
			await userEvent.keyboard('{ArrowRight}');
			await expect(host).toHaveAttribute('value', '0.3');
			await expect(getValueLabel(root)).toHaveTextContent('0.3');
		});
	},
};

export const AsField: Story = {
	render: () => (
		<RuiField name="volume">
			<RuiLabel>Volume</RuiLabel>
			<RuiSlider min={0} max={100} value={50} />
			<RuiFieldDescription>Adjust playback volume from 0 to 100.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	),
	play: async ({ canvasElement: root, step }) => {
		await step('connects the field label to the focusable slider thumb', async () => {
			const label = root.querySelector('.rui-label') as HTMLLabelElement;
			const thumb = getSingleThumb(root);

			await expect(label).toHaveAttribute('for', thumb.id);
		});
	},
};
