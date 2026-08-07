import { defineComponentDoc, definePlayground, defineScenario, booleanControl, textControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'radio-group',
	title: 'Radio Group',
	exportName: 'RuiRadioGroup',
	category: 'Forms',
	lede: 'Radio groups present mutually exclusive options. Only one choice can be selected at a time within the group.',
	usage: {
		intro: 'Set `value` for the selected option and provide radio inputs as children. Wrap in `RuiField` for form integration.',
		example: `import { RuiRadioGroup } from '@ecopages/radiant-ui/radio-group';
import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';

<RuiField name="plan">
  <RuiLabel>Plan</RuiLabel>
  <RuiRadioGroup value="pro" name="plan" label="Plan">
    <label><input type="radio" value="free" /> Free</label>
    <label><input type="radio" value="pro" /> Pro</label>
  </RuiRadioGroup>
</RuiField>`,
	},
	guidance: [
		{
			id: 'mutually-exclusive',
			title: 'Mutually exclusive choices',
			paragraphs: [
				'Use radio groups when options are mutually exclusive. For independent toggles, use checkboxes instead.',
			],
		},
	],
	accessibility: [
		'The group exposes `role="radiogroup"` with an accessible name from `label`.',
		'Arrow keys move selection between radio options.',
		'Visually indicate the selected option — do not rely on position alone.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					textControl({
						prop: 'value',
						label: 'Value',
						defaultValue: 'pro',
					}),
					booleanControl({
						prop: 'disabled',
						label: 'Disabled',
						defaultValue: false,
					}),
					textControl({
						prop: 'label',
						label: 'Label',
						defaultValue: 'Plan',
					}),
				],
			}),
		],
	}),
});
