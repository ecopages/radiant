import { RuiCarousel, RuiCarouselNext, RuiCarouselPrev, RuiCarouselSlide } from '@ecopages/radiant-ui/carousel';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type CarouselArgs = {
	index: number;
	transition: 'none' | 'slide' | 'fade';
	autoplay: boolean;
	interval: number;
	showIndicators: boolean;
	loop: boolean;
};

export const meta = {
	args: {
		index: 0,
		transition: 'slide',
		autoplay: false,
		interval: 4000,
		showIndicators: false,
		loop: true,
	},
	argTypes: {
		index: { control: { type: 'number' } },
		transition: {
			control: { type: 'select' },
			options: ['none', 'slide', 'fade'] as const satisfies readonly CarouselArgs['transition'][],
		},
		autoplay: { control: { type: 'boolean' } },
		interval: { control: { type: 'number' } },
		showIndicators: { control: { type: 'boolean' } },
		loop: { control: { type: 'boolean' } },
	},
	render: (args) => (
		<RuiCarousel
			index={args.index}
			transition={args.transition}
			autoplay={args.autoplay}
			interval={args.interval}
			showIndicators={args.showIndicators}
			loop={args.loop}
		>
			<RuiCarouselSlide id="slide-1">First panel</RuiCarouselSlide>
			<RuiCarouselSlide id="slide-2">Second panel</RuiCarouselSlide>
			<RuiCarouselSlide id="slide-3">Third panel</RuiCarouselSlide>
			<RuiCarouselPrev />
			<RuiCarouselNext />
		</RuiCarousel>
	),
} satisfies DocsMeta<CarouselArgs>;

type Story = DocsStory<CarouselArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'carousel/default' } } });

export const WithIndicators: Story = docsStory(meta, {
	args: { showIndicators: true },
	parameters: { docs: { id: 'carousel/indicators' } },
});

export const OverlayControls: Story = docsStory(meta, {
	render: (args) => (
		<RuiCarousel
			index={args.index}
			transition={args.transition}
			autoplay={args.autoplay}
			interval={args.interval}
			showIndicators={args.showIndicators}
			loop={args.loop}
			controlsVariant="overlay"
		>
			<RuiCarouselSlide id="slide-1">First panel</RuiCarouselSlide>
			<RuiCarouselSlide id="slide-2">Second panel</RuiCarouselSlide>
			<RuiCarouselSlide id="slide-3">Third panel</RuiCarouselSlide>
			<RuiCarouselPrev />
			<RuiCarouselNext />
		</RuiCarousel>
	),
	parameters: { docs: { id: 'carousel/overlay' } },
});
