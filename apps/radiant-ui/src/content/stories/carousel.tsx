import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type CarouselArgs = {
	index: number;
	transition: string;
	autoplay: boolean;
	interval: number;
	showIndicators: boolean;
	loop: boolean;
};

export const meta = {
	component: 'carousel',
	exportName: 'RuiCarousel',
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
		transition: { control: { type: 'select' }, options: ['none', 'slide', 'fade'] as const },
		autoplay: { control: { type: 'boolean' } },
		interval: { control: { type: 'number' } },
		showIndicators: { control: { type: 'boolean' } },
		loop: { control: { type: 'boolean' } },
	},
	exampleCode: (args) => buildExampleCode('RuiCarousel', 'carousel', args),
	render: (args) => renderPlaygroundPreview('carousel', args),
} satisfies DocsMeta<CarouselArgs>;

type Story = DocsStory<CarouselArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'carousel/default' } } });
