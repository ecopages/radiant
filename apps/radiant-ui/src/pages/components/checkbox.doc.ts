import { defineComponentDoc, definePlayground, defineScenario, booleanControl, textControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'checkbox',
	title: 'Checkbox',
	exportName: 'RuiCheckbox',
	category: 'Forms',
	lede: 'Checkboxes toggle independent options on or off. Use them when each choice is unrelated and more than one can be selected.',
	usage: {
		intro: 'Wrap a checkbox in `RuiField` with `RuiLabel` for consistent spacing and error display. Bind `checked` for controlled state.',
		example: `import { RuiCheckbox } from '@ecopages/radiant-ui/checkbox';
import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';

<RuiField name="newsletter">
  <RuiLabel>Email me product updates</RuiLabel>
  <RuiCheckbox checked={subscribed} value="yes" />
</RuiField>`,
	},
	guidance: [
		{
			id: 'indeterminate-state',
			title: 'Indeterminate selections',
			paragraphs: [
				'Set `indeterminate` when a parent checkbox represents a partially selected group. Clear indeterminate once the user makes an explicit choice.',
			],
		},
		{
			id: 'field-wiring',
			title: 'Wire through RuiField',
			paragraphs: [
				'Pass `name` on `RuiField` so the checkbox participates in `RuiForm` validation and submission.',
			],
		},
	],
	accessibility: [
		'Every checkbox needs a visible label — use `RuiLabel` or `aria-label`.',
		'Indeterminate state is exposed with `aria-checked="mixed"`.',
		'Disabled checkboxes should include context explaining why the option is unavailable.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					booleanControl({
						prop: 'checked',
						label: 'Checked',
						defaultValue: false,
					}),
					booleanControl({
						prop: 'indeterminate',
						label: 'Indeterminate',
						defaultValue: false,
					}),
					booleanControl({
						prop: 'disabled',
						label: 'Disabled',
						defaultValue: false,
					}),
					textControl({
						prop: 'value',
						label: 'Value',
						defaultValue: 'on',
					}),
				],
			}),
		],
	}),
});
