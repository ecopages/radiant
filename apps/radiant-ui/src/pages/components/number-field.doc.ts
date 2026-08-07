import { defineComponentDoc, definePlayground, defineScenario, booleanControl, numberControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'number-field',
	title: 'Number Field',
	exportName: 'RuiNumberField',
	category: 'Forms',
	lede: 'Number fields collect numeric input with increment/decrement steppers, locale formatting, and min/max constraints.',
	usage: {
		intro: 'Set `minValue`, `maxValue`, and `step` to constrain input. Compose with `RuiNumberFieldGroup` and stepper buttons for the full pattern.',
		example: `import {
  RuiNumberField,
  RuiNumberFieldGroup,
  RuiNumberFieldInput,
  RuiNumberFieldDecrementButton,
  RuiNumberFieldIncrementButton,
  RuiNumberFieldSteppers,
} from '@ecopages/radiant-ui/number-field';

<RuiNumberField value={3} minValue={0} maxValue={10} step={1}>
  <RuiNumberFieldGroup>
    <RuiNumberFieldInput />
    <RuiNumberFieldSteppers>
      <RuiNumberFieldDecrementButton />
      <RuiNumberFieldIncrementButton />
    </RuiNumberFieldSteppers>
  </RuiNumberFieldGroup>
</RuiNumberField>`,
	},
	guidance: [
		{
			id: 'step-behavior',
			title: 'Step and commit behavior',
			paragraphs: [
				'`commitBehavior` controls whether out-of-range typed values snap to bounds or reject on blur.',
			],
		},
		{
			id: 'wheel-disabled',
			title: 'Disable scroll wheel',
			paragraphs: [
				'Set `wheelDisabled` to prevent accidental value changes when users scroll over a focused number field.',
			],
		},
	],
	accessibility: [
		'Stepper buttons need accessible names — "Increment" and "Decrement" are provided by default.',
		'Announce min and max constraints in helper text when the valid range is not obvious.',
		'Disabled fields should explain why editing is unavailable.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					numberControl({
						prop: 'value',
						label: 'Value',
						defaultValue: 3,
						min: 0,
						max: 100,
						step: 1,
					}),
					numberControl({
						prop: 'minValue',
						label: 'Min',
						defaultValue: 0,
						min: 0,
						max: 100,
						step: 1,
					}),
					numberControl({
						prop: 'maxValue',
						label: 'Max',
						defaultValue: 10,
						min: 0,
						max: 100,
						step: 1,
					}),
					numberControl({
						prop: 'step',
						label: 'Step',
						defaultValue: 1,
						min: 0.1,
						max: 10,
						step: 0.1,
					}),
					booleanControl({
						prop: 'disabled',
						label: 'Disabled',
						defaultValue: false,
					}),
					booleanControl({
						prop: 'wheelDisabled',
						label: 'Wheel disabled',
						defaultValue: false,
					}),
				],
			}),
		],
	}),
});
