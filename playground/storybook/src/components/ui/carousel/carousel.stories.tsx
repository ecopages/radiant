import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent } from 'storybook/test';
import { RuiCarousel } from './carousel';

const slides = [
	{ id: '1', children: <p>Slide one</p> },
	{ id: '2', children: <p>Slide two</p> },
	{ id: '3', children: <p>Slide three</p> },
];

const meta = {
	title: 'Components/Carousel',
	component: RuiCarousel,
	args: {
		label: 'Featured products',
		index: 0,
		slides,
	},
} satisfies Meta<typeof RuiCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

const getSlides = (canvas: HTMLElement) => Array.from(canvas.querySelectorAll('[data-slide]')) as HTMLElement[];

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const next = canvasElement.querySelector('[data-ref="next"]') as HTMLButtonElement;
		const slides = getSlides(canvasElement);

		await step('next reveals the following slide', async () => {
			await expect(slides[0]).not.toHaveAttribute('hidden');
			await userEvent.click(next);
			await expect(slides[1]).not.toHaveAttribute('hidden');
			await expect(slides[0]).toHaveAttribute('hidden');
		});
	},
};

export const WithSlideTransition: Story = {
	args: {
		transition: 'slide',
	},
	play: async ({ canvasElement, step }) => {
		const root = canvasElement.querySelector('.rui-carousel') as HTMLElement;
		const next = canvasElement.querySelector('[data-ref="next"]') as HTMLButtonElement;
		const slides = getSlides(canvasElement);

		await step('slide transition keeps slides in the track', async () => {
			await expect(root).toHaveClass('rui-carousel--slide');
			await userEvent.click(next);
			await expect(slides[1]).toHaveAttribute('data-active', 'true');
			await expect(slides[1]).not.toHaveAttribute('hidden');
		});
	},
};

export const WithFadeTransition: Story = {
	args: {
		transition: 'fade',
	},
	play: async ({ canvasElement, step }) => {
		const root = canvasElement.querySelector('.rui-carousel') as HTMLElement;
		const next = canvasElement.querySelector('[data-ref="next"]') as HTMLButtonElement;
		const slides = getSlides(canvasElement);

		await step('fade transition marks the active slide', async () => {
			await expect(root).toHaveClass('rui-carousel--fade');
			await userEvent.click(next);
			await expect(slides[1]).toHaveAttribute('data-active', 'true');
		});
	},
};

export const WithIndicators: Story = {
	args: {
		showIndicators: true,
	},
	play: async ({ canvasElement, step }) => {
		const slides = getSlides(canvasElement);

		await step('indicator selects a slide', async () => {
			const indicators = Array.from(
				canvasElement.querySelectorAll('[data-carousel-indicator]'),
			) as HTMLButtonElement[];
			await expect(indicators).toHaveLength(3);
			await userEvent.click(indicators[2]);
			await expect(slides[2]).toHaveAttribute('data-active', 'true');
			await expect(indicators[2]).toHaveAttribute('aria-selected', 'true');
		});

		await step('arrow keys move across indicators', async () => {
			const indicators = Array.from(
				canvasElement.querySelectorAll('[data-carousel-indicator]'),
			) as HTMLButtonElement[];
			await expect(indicators[1]).toHaveAttribute('aria-selected', 'false');
			await userEvent.click(indicators[1]);
			await expect(getSlides(canvasElement)[1]).toHaveAttribute('data-active', 'true');
			await expect(indicators[1]).toHaveAttribute('aria-selected', 'true');
		});
	},
};

export const AutoplayWithControls: Story = {
	args: {
		autoplay: true,
		showRotationControl: true,
	},
	play: async ({ canvasElement, step }) => {
		const rotation = canvasElement.querySelector('[data-ref="rotation"]') as HTMLButtonElement;

		await step('rotation control pauses autoplay', async () => {
			await expect(rotation).toHaveAttribute('aria-pressed', 'true');
			await userEvent.click(rotation);
			await expect(rotation).toHaveAttribute('aria-pressed', 'false');
			await expect(rotation).toHaveAttribute('aria-label', 'Start rotation');
		});
	},
};

export const NoLoop: Story = {
	args: {
		wrap: false,
	},
	play: async ({ canvasElement, step }) => {
		const next = canvasElement.querySelector('[data-ref="next"]') as HTMLButtonElement;
		const prev = canvasElement.querySelector('[data-ref="prev"]') as HTMLButtonElement;
		const host = canvasElement.querySelector('rui-carousel') as HTMLElement;

		await step('next is disabled on the last slide', async () => {
			await userEvent.click(next);
			await userEvent.click(next);
			await expect(host).toHaveAttribute('index', '2');
			await expect(next).toBeDisabled();
			await userEvent.click(prev);
			await expect(host).toHaveAttribute('index', '1');
			await expect(next).not.toBeDisabled();
		});
	},
};
