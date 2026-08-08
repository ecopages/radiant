import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type SliderArgs = {
	variant: string;
	value: number;
	min: number;
	max: number;
	step: number;
	disabled: boolean;
};

export const meta = {
	component: 'slider',
	exportName: 'RuiSlider',
	args: {
		variant: 'single',
		value: 50,
		min: 0,
		max: 100,
		step: 1,
		disabled: false,
	},
	argTypes: {
		variant: { control: { type: 'select' }, options: ['single', 'range'] as const },
		value: { control: { type: 'number' } },
		min: { control: { type: 'number' } },
		max: { control: { type: 'number' } },
		step: { control: { type: 'number' } },
		disabled: { control: { type: 'boolean' } },
	},
	exampleCode: (args) => buildExampleCode('RuiSlider', 'slider', args),
	render: (args) => renderPlaygroundPreview('slider', args),
} satisfies DocsMeta<SliderArgs>;

type Story = DocsStory<SliderArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'slider/default' } } });
