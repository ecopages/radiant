import { RuiMeter } from '@ecopages/radiant-ui/meter';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type MeterArgs = {
	value: number;
	min: number;
	max: number;
	label: string;
};

export const meta = {
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
	render: (args) => <RuiMeter value={args.value} min={args.min} max={args.max} label={args.label} />,
} satisfies DocsMeta<MeterArgs>;

type Story = DocsStory<MeterArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'meter/default' } } });
