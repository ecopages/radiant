import { defineComponentDoc, definePlayground, defineScenario, textControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'label',
	title: 'Label',
	exportName: 'RuiLabel',
	category: 'Forms',
	lede: 'Labels name form controls so users and assistive technologies know what data to enter.',
	usage: {
		intro: 'Place `RuiLabel` as the first child of `RuiField`. It automatically associates with the nested control.',
		example: `import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiInput } from '@ecopages/radiant-ui/input';

<RuiField name="username">
  <RuiLabel>Username</RuiLabel>
  <RuiInput />
</RuiField>`,
	},
	guidance: [
		{
			id: 'visible-labels',
			title: 'Always visible',
			paragraphs: [
				'Labels should remain visible when the field is focused. Do not rely on placeholder text as a label replacement.',
			],
		},
	],
	accessibility: [
		'Labels are linked to controls via `for` / `id` wiring inside `RuiField`.',
		'Write labels as nouns or short phrases — "Email address", not "Enter your email".',
		'Required fields should indicate requirement in the label or with adjacent text, not color alone.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					textControl({
						prop: 'htmlFor',
						label: 'htmlFor',
						defaultValue: '',
					}),
				],
				children: 'Username',
			}),
		],
	}),
});
