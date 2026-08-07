import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	selectControl,
	textControl,
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'input',
	title: 'Input',
	exportName: 'RuiInput',
	category: 'Forms',
	lede: 'Inputs capture single-line text, numbers, emails, and other native input types with Radiant sizing and focus styles.',
	usage: {
		intro: 'Wrap inputs in `RuiField` for labels and validation. Set `type`, `size`, and `placeholder` as needed.',
		example: `import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';

<RuiField name="email">
  <RuiLabel>Email</RuiLabel>
  <RuiInput type="email" size="md" placeholder="you@example.com" />
</RuiField>`,
	},
	guidance: [
		{
			id: 'input-types',
			title: 'Choose the right type',
			paragraphs: [
				'Use `email`, `url`, and `tel` to trigger appropriate mobile keyboards. Use `password` for credential fields.',
			],
		},
		{
			id: 'field-discovery',
			title: 'Marked for Field discovery',
			paragraphs: [
				'`RuiInput` sets `data-rui-control` so `RuiField` can wire labels, validation, and ARIA. Prefer it over a bare `<input>` inside forms.',
			],
		},
		{
			id: 'masking',
			title: 'Input masks',
			paragraphs: ['Pass a `mask` pattern for structured entry like phone numbers or credit card segments.'],
		},
	],
	accessibility: [
		'Every input needs a visible label — placeholders are not substitutes.',
		'Disabled inputs should explain why editing is unavailable.',
		'Use `type` attributes that match the expected data format.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					selectControl({
						prop: 'size',
						label: 'Size',
						defaultValue: 'md',
						options: [
							{
								value: 'sm',
								label: 'Small',
							},
							{
								value: 'md',
								label: 'Medium',
							},
							{
								value: 'lg',
								label: 'Large',
							},
						],
					}),
					selectControl({
						prop: 'type',
						label: 'Type',
						defaultValue: 'text',
						options: [
							{
								value: 'text',
								label: 'Text',
							},
							{
								value: 'email',
								label: 'Email',
							},
							{
								value: 'password',
								label: 'Password',
							},
							{
								value: 'number',
								label: 'Number',
							},
						],
					}),
					booleanControl({
						prop: 'disabled',
						label: 'Disabled',
						defaultValue: false,
					}),
					textControl({
						prop: 'placeholder',
						label: 'Placeholder',
						defaultValue: 'you@example.com',
					}),
				],
			}),
		],
	}),
});
