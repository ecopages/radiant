import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiKnob } from '@ecopages/radiant-ui/knob';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type KnobArgs = {
	value: number;
	min: number;
	max: number;
	step: number;
	valuePrecision?: number;
	disabled: boolean;
	readOnly: boolean;
	showValue: boolean;
	valuePosition: 'center' | 'below';
};

export const meta = {
	args: {
		value: 50,
		min: 0,
		max: 100,
		step: 1,
		disabled: false,
		readOnly: false,
		showValue: true,
		valuePosition: 'center',
	},
	argTypes: {
		value: { control: { type: 'number' } },
		min: { control: { type: 'number' } },
		max: { control: { type: 'number' } },
		step: { control: { type: 'number' } },
		valuePrecision: { control: { type: 'number' } },
		disabled: { control: { type: 'boolean' } },
		readOnly: { control: { type: 'boolean' } },
		showValue: { control: { type: 'boolean' } },
		valuePosition: {
			control: { type: 'select' },
			options: ['center', 'below'] as const satisfies readonly KnobArgs['valuePosition'][],
		},
	},
	render: (args) => (
		<RuiField name="gain">
			<RuiLabel>Gain</RuiLabel>
			<RuiKnob
				value={args.value}
				min={args.min}
				max={args.max}
				step={args.step}
				valuePrecision={args.valuePrecision}
				disabled={args.disabled}
				readOnly={args.readOnly}
				showValue={args.showValue}
				valuePosition={args.valuePosition}
			/>
		</RuiField>
	),
} satisfies DocsMeta<KnobArgs>;

type Story = DocsStory<KnobArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'knob/default' } } });
