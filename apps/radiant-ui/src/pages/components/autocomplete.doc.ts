import { defineComponentDoc, definePlayground, defineScenario, selectControl, textControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'autocomplete',
	title: 'Autocomplete',
	exportName: 'RuiAutocomplete',
	category: 'Forms',
	lede: 'Autocomplete filters a large option set as the user types. It is the right choice when the full list is too long to scan in a static select.',
	usage: {
		intro: 'Wrap a text input, option collection, and empty state inside `RuiAutocomplete`. Pair it with `RuiListbox` and `RuiListboxOption` for the filtered results.',
		example: `import { RuiAutocomplete, RuiAutocompleteInput, RuiAutocompleteCollection, RuiAutocompleteEmpty } from '@ecopages/radiant-ui/autocomplete';
import { RuiListbox, RuiListboxOption } from '@ecopages/radiant-ui/listbox';

<RuiAutocomplete sensitivity="base">
  <RuiAutocompleteInput placeholder="Search animals" />
  <RuiAutocompleteCollection>
    <RuiListbox>
      <RuiListboxOption value="cat">Cat</RuiListboxOption>
      <RuiListboxOption value="dog">Dog</RuiListboxOption>
    </RuiListbox>
  </RuiAutocompleteCollection>
  <RuiAutocompleteEmpty>No matches found.</RuiAutocompleteEmpty>
</RuiAutocomplete>`,
	},
	guidance: [
		{
			id: 'filter-sensitivity',
			title: 'Tune filter sensitivity',
			paragraphs: [
				'Use `base` for standard substring matching. Choose `accent` or `case` when your locale or dataset requires looser or stricter comparison.',
			],
		},
		{
			id: 'controlled-input',
			title: 'Control the input value',
			paragraphs: [
				'Bind `inputValue` when you need to reset the field after selection or sync with external search state.',
			],
		},
	],
	accessibility: [
		'The input exposes combobox semantics with `aria-expanded` tied to the listbox visibility.',
		'Keyboard users can move through options with arrow keys; Enter selects the focused option.',
		'Provide an accessible label via `RuiLabel` or `aria-label` on the input.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					selectControl({
						prop: 'sensitivity',
						label: 'Sensitivity',
						defaultValue: 'base',
						options: [
							{
								value: 'base',
								label: 'Base',
							},
							{
								value: 'accent',
								label: 'Accent',
							},
							{
								value: 'case',
								label: 'Case',
							},
						],
					}),
					textControl({
						prop: 'inputValue',
						label: 'Input value',
						defaultValue: '',
					}),
				],
			}),
		],
	}),
});
