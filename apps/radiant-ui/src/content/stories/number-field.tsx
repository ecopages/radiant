import {
	RuiNumberField,
	RuiNumberFieldDecrementButton,
	RuiNumberFieldGroup,
	RuiNumberFieldIncrementButton,
	RuiNumberFieldInput,
	RuiNumberFieldSteppers,
} from '@ecopages/radiant-ui/number-field';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type NumberFieldArgs = {
	value: number;
	minValue: number;
	maxValue: number;
	step: number;
	disabled: boolean;
	wheelDisabled: boolean;
};

export const meta = {
	args: {
		value: 3,
		minValue: 0,
		maxValue: 10,
		step: 1,
		disabled: false,
		wheelDisabled: false,
	},
	argTypes: {
		value: { control: { type: 'number' } },
		minValue: { control: { type: 'number' } },
		maxValue: { control: { type: 'number' } },
		step: { control: { type: 'number' } },
		disabled: { control: { type: 'boolean' } },
		wheelDisabled: { control: { type: 'boolean' } },
	},
	render: (args) => (
		<RuiNumberField
			value={args.value}
			minValue={args.minValue}
			maxValue={args.maxValue}
			step={args.step}
			disabled={args.disabled}
			wheelDisabled={args.wheelDisabled}
		>
			<RuiNumberFieldGroup>
				<RuiNumberFieldInput />
				<RuiNumberFieldSteppers>
					<RuiNumberFieldDecrementButton />
					<RuiNumberFieldIncrementButton />
				</RuiNumberFieldSteppers>
			</RuiNumberFieldGroup>
		</RuiNumberField>
	),
} satisfies DocsMeta<NumberFieldArgs>;

type Story = DocsStory<NumberFieldArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'number-field/default' } } });
