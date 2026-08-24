import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiSlider } from '@ecopages/radiant-ui/slider';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type SliderArgs = {
	variant: 'single' | 'range';
	value: number;
	rangeMin: number;
	rangeMax: number;
	min: number;
	max: number;
	step: number;
	disabled: boolean;
	showValue: boolean;
};

export const meta = {
	args: {
		variant: 'single',
		value: 50,
		rangeMin: 25,
		rangeMax: 75,
		min: 0,
		max: 100,
		step: 1,
		disabled: false,
		showValue: true,
	},
	argTypes: {
		variant: {
			control: { type: 'select' },
			options: ['single', 'range'] as const satisfies readonly SliderArgs['variant'][],
		},
		value: { control: { type: 'number' } },
		rangeMin: { control: { type: 'number' } },
		rangeMax: { control: { type: 'number' } },
		min: { control: { type: 'number' } },
		max: { control: { type: 'number' } },
		step: { control: { type: 'number' } },
		disabled: { control: { type: 'boolean' } },
		showValue: { control: { type: 'boolean' } },
	},
	render: (args) => {
		if (args.variant === 'range') {
			return (
				<RuiField name="preview">
					<RuiLabel>Volume range</RuiLabel>
					<RuiSlider
						variant="range"
						min={args.min}
						max={args.max}
						step={args.step}
						disabled={args.disabled}
						showValue={args.showValue}
						values={[args.rangeMin, args.rangeMax]}
					/>
				</RuiField>
			);
		}

		return (
			<RuiField name="preview">
				<RuiLabel>Volume</RuiLabel>
				<RuiSlider
					variant="single"
					value={args.value}
					min={args.min}
					max={args.max}
					step={args.step}
					disabled={args.disabled}
					showValue={args.showValue}
				/>
			</RuiField>
		);
	},
} satisfies DocsMeta<SliderArgs>;

type Story = DocsStory<SliderArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'slider/default' } } });
