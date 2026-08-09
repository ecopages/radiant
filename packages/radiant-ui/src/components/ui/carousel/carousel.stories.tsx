import { radiantMeta, type StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { RuiCarousel, RuiCarouselNext, RuiCarouselPrev } from './carousel';
import { RuiCarousel as RuiCarouselElement } from './carousel.script';

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
};
radiantMeta(meta, { element: RuiCarouselElement, stylesheets: ['./carousel.css'] });

export default meta;
type Story = StoryObj<typeof meta>;

const getSlides = (canvas: HTMLElement) => Array.from(canvas.querySelectorAll('[data-slide]')) as HTMLElement[];

const getNextButton = (canvas: HTMLElement) =>
	canvas.querySelector('[data-carousel-action="next"]') as HTMLButtonElement;

const getPrevButton = (canvas: HTMLElement) =>
	canvas.querySelector('[data-carousel-action="prev"]') as HTMLButtonElement;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		const next = getNextButton(canvasElement);
		const slideEls = getSlides(canvasElement);

		await step('next reveals the following slide', async () => {
			await expect(slideEls[0]).not.toHaveAttribute('hidden');
			await userEvent.click(next);
			await expect(slideEls[1]).not.toHaveAttribute('hidden');
			await expect(slideEls[0]).toHaveAttribute('hidden');
		});
	},
};

export const WithSlideTransition: Story = {
	args: {
		transition: 'slide',
	},
	play: async ({ canvasElement, step }) => {
		const root = canvasElement.querySelector('.rui-carousel') as HTMLElement;
		const next = getNextButton(canvasElement);
		const slideEls = getSlides(canvasElement);

		await step('slide transition keeps slides in the track', async () => {
			await expect(root).toHaveClass('rui-carousel--slide');
			await userEvent.click(next);
			await expect(slideEls[1]).toHaveAttribute('data-active', 'true');
			await expect(slideEls[1]).not.toHaveAttribute('hidden');
		});
	},
};

export const WithFadeTransition: Story = {
	args: {
		transition: 'fade',
	},
	play: async ({ canvasElement, step }) => {
		const root = canvasElement.querySelector('.rui-carousel') as HTMLElement;
		const next = getNextButton(canvasElement);
		const slideEls = getSlides(canvasElement);

		await step('fade transition marks the active slide', async () => {
			await expect(root).toHaveClass('rui-carousel--fade');
			await userEvent.click(next);
			await expect(slideEls[1]).toHaveAttribute('data-active', 'true');
		});
	},
};

export const WithIndicators: Story = {
	args: {
		showIndicators: true,
	},
	play: async ({ canvasElement, step }) => {
		const slideEls = getSlides(canvasElement);

		await step('indicator selects a slide', async () => {
			const tablist = canvasElement.querySelector('[role="tablist"]') as HTMLElement;
			const indicators = Array.from(
				canvasElement.querySelectorAll('[data-carousel-indicator]'),
			) as HTMLButtonElement[];
			await expect(tablist).toHaveAttribute('aria-label', 'Choose slide to display');
			await expect(indicators).toHaveLength(3);
			await expect(indicators[0]).toHaveAttribute('aria-controls');
			await userEvent.click(indicators[2]);
			await expect(slideEls[2]).toHaveAttribute('data-active', 'true');
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
		interval: 200,
	},
	play: async ({ canvasElement, step }) => {
		const host = canvasElement.querySelector('rui-carousel') as HTMLElement;
		const rotation = canvasElement.querySelector('[data-carousel-action="rotation"]') as HTMLButtonElement;
		const slideEls = getSlides(canvasElement);

		await step('autoplay advances to the next slide', async () => {
			await expect(slideEls[0]).toHaveAttribute('data-active', 'true');
			await waitFor(
				() => {
					expect(host).toHaveAttribute('index', '1');
				},
				{ timeout: 1500 },
			);
			await expect(slideEls[1]).toHaveAttribute('data-active', 'true');
		});

		await step('rotation control pauses autoplay', async () => {
			await userEvent.click(rotation);
			await expect(rotation).toHaveAttribute('aria-pressed', 'false');
			await expect(rotation).toHaveAttribute('aria-label', 'Start rotation');
			const indexBefore = host.getAttribute('index');
			await new Promise((resolve) => setTimeout(resolve, 400));
			await expect(host).toHaveAttribute('index', indexBefore ?? '1');
		});
	},
};

export const NoLoop: Story = {
	args: {
		wrap: false,
	},
	play: async ({ canvasElement, step }) => {
		const next = getNextButton(canvasElement);
		const prev = getPrevButton(canvasElement);
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

export const WithSwipe: Story = {
	play: async ({ canvasElement, step }) => {
		const viewport = canvasElement.querySelector('[data-ref="viewport"]') as HTMLElement;
		const slideEls = getSlides(canvasElement);

		await step('swipe left moves to the next slide', async () => {
			await expect(slideEls[0]).toHaveAttribute('data-active', 'true');
			const swipeLeft = () => {
				viewport.dispatchEvent(
					new PointerEvent('pointerdown', {
						bubbles: true,
						button: 0,
						pointerId: 1,
						clientX: 200,
						clientY: 80,
					}),
				);
				viewport.dispatchEvent(
					new PointerEvent('pointerup', { bubbles: true, button: 0, pointerId: 1, clientX: 60, clientY: 80 }),
				);
			};
			swipeLeft();
			await waitFor(() => expect(getSlides(canvasElement)[1]).toHaveAttribute('data-active', 'true'));
		});

		await step('swipe right moves to the previous slide', async () => {
			const swipeRight = () => {
				viewport.dispatchEvent(
					new PointerEvent('pointerdown', {
						bubbles: true,
						button: 0,
						pointerId: 2,
						clientX: 60,
						clientY: 80,
					}),
				);
				viewport.dispatchEvent(
					new PointerEvent('pointerup', {
						bubbles: true,
						button: 0,
						pointerId: 2,
						clientX: 200,
						clientY: 80,
					}),
				);
			};
			swipeRight();
			await waitFor(() => expect(getSlides(canvasElement)[0]).toHaveAttribute('data-active', 'true'));
		});
	},
};

export const WithOverlayControls: Story = {
	args: {
		controlsVariant: 'overlay',
		showIndicators: true,
		transition: 'fade',
	},
	play: async ({ canvasElement, step }) => {
		const root = canvasElement.querySelector('.rui-carousel') as HTMLElement;
		const next = getNextButton(canvasElement);

		await step('overlay variant places nav on the slide', async () => {
			await expect(root).toHaveClass('rui-carousel--controls-overlay');
			await expect(canvasElement.querySelector('.rui-carousel__controls--overlay')).toBeTruthy();
			await userEvent.click(next);
			await expect(getSlides(canvasElement)[1]).toHaveAttribute('data-active', 'true');
		});
	},
};

export const CustomControls: Story = {
	args: {
		controlsVariant: 'overlay',
		children: (
			<>
				<RuiCarouselPrev overlay />
				<RuiCarouselNext overlay />
				{slides.map((slide) => (
					<div class="rui-carousel__slide" data-slide={slide.id}>
						{slide.children}
					</div>
				))}
			</>
		),
		slides: undefined,
	},
	play: async ({ canvasElement, step }) => {
		const prev = getPrevButton(canvasElement);
		const next = getNextButton(canvasElement);

		await step('custom overlay controls navigate slides', async () => {
			await expect(prev).toHaveClass('rui-carousel__nav--overlay');
			await expect(next).toHaveClass('rui-carousel__nav--overlay');
			await userEvent.click(next);
			await waitFor(() => expect(getSlides(canvasElement)[1]).toHaveAttribute('data-active', 'true'));
			const prevAgain = getPrevButton(canvasElement);
			await userEvent.click(prevAgain);
			await waitFor(() => expect(getSlides(canvasElement)[0]).toHaveAttribute('data-active', 'true'));
		});
	},
};
