import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	selectControl,
	textControl,
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'select',
	title: 'Select',
	exportName: 'RuiSelect',
	category: 'Forms',
	lede: 'Selects let users choose one or more values from a predefined list inside a compact trigger and popup listbox.',
	usage: {
		intro: 'Pass `options` for a simple API, or compose `RuiSelectControl`, `RuiSelectTrigger`, `RuiSelectValue`, and `RuiSelectListbox` for full control.',
		example: `import { RuiSelect } from '@ecopages/radiant-ui/select';
import { RuiLabel } from '@ecopages/radiant-ui/label';

<RuiLabel>Animal</RuiLabel>
<RuiSelect
  value="cat"
  placeholder="Select an animal"
  options={[
    { value: 'cat', label: 'Cat' },
    { value: 'dog', label: 'Dog' },
  ]}
/>`,
	},
	guidance: [
		{
			id: 'multiple-selection',
			title: 'Multiple selection',
			paragraphs: [
				'Set `selectionMode="multiple"` for multi-select. Selected values appear as tags via `RuiTagGroup`.',
			],
		},
		{
			id: 'searchable-select',
			title: 'Searchable lists',
			paragraphs: ['Add `RuiSelectSearch` inside the listbox for long option sets that benefit from filtering.'],
		},
	],
	accessibility: [
		'The trigger exposes `aria-expanded` and `aria-haspopup="listbox"`.',
		'Selected values are reflected in `RuiSelectValue` for screen readers.',
		'Provide a visible label — the placeholder is not a substitute.',
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
						defaultValue: 'cat',
					}),
					textControl({
						prop: 'placeholder',
						label: 'Placeholder',
						defaultValue: 'Select an animal',
					}),
					booleanControl({
						prop: 'disabled',
						label: 'Disabled',
						defaultValue: false,
					}),
					selectControl({
						prop: 'selectionMode',
						label: 'Selection mode',
						defaultValue: 'single',
						options: [
							{
								value: 'single',
								label: 'Single',
							},
							{
								value: 'multiple',
								label: 'Multiple',
							},
						],
					}),
				],
			}),
		],
	}),
});
