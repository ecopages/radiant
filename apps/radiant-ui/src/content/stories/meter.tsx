import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type MeterArgs = {
	value: number;
	min: number;
	max: number;
	label: string;
};

export const meta = {
	component: 'meter',
	exportName: 'RuiMeter',
	args: {
		value: 72,
		min: 0,
		max: 100,
		label: 'Storage used',
	},
	argTypes: {
		value: { control: { type: 'number' } },
		min: { control: { type: 'number' } },
		max: { control: { type: 'number' } },
		label: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiMeter', 'meter', args),
	render: (args) => renderPlaygroundPreview('meter', args),
} satisfies DocsMeta<MeterArgs>;

type Story = DocsStory<MeterArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'meter/default' } } });
