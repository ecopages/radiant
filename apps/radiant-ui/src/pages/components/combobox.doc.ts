import { defineComponentDoc, definePlayground, defineScenario, booleanControl, textControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'combobox',
	title: 'Combobox',
	exportName: 'RuiCombobox',
	category: 'Forms',
	lede: 'A combobox combines a text field with a filterable popup list. Use it when users may type a value or pick from suggestions.',
	usage: {
		intro: 'Compose `RuiComboboxControl`, `RuiComboboxInput`, `RuiComboboxTrigger`, and `RuiComboboxListbox` with `RuiListboxOption` children.',
		example: `import { RuiCombobox, RuiComboboxControl, RuiComboboxInput, RuiComboboxTrigger, RuiComboboxListbox } from '@ecopages/radiant-ui/combobox';
import { RuiListbox, RuiListboxOption } from '@ecopages/radiant-ui/listbox';

<RuiCombobox value="cat" placeholder="Choose an animal">
  <RuiComboboxControl>
    <RuiComboboxInput />
    <RuiComboboxTrigger />
  </RuiComboboxControl>
  <RuiComboboxListbox>
    <RuiListbox>
      <RuiListboxOption value="cat">Cat</RuiListboxOption>
      <RuiListboxOption value="dog">Dog</RuiListboxOption>
    </RuiListbox>
  </RuiComboboxListbox>
</RuiCombobox>`,
	},
	guidance: [
		{
			id: 'open-on-focus',
			title: 'Open on focus',
			paragraphs: [
				'Enable `openOnFocus` when the option set is small and users benefit from seeing choices immediately. Disable it for large datasets.',
			],
		},
		{
			id: 'free-text',
			title: 'Allow custom values',
			paragraphs: [
				'Comboboxes accept typed input that may not match an option. Validate on submit if only predefined values are permitted.',
			],
		},
	],
	accessibility: [
		'The input exposes `role="combobox"` with `aria-expanded` reflecting popup state.',
		'Associate a visible label via `label` or `RuiLabel`.',
		'Announce the number of filtered results when the list changes substantially.',
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
						defaultValue: '',
					}),
					textControl({
						prop: 'placeholder',
						label: 'Placeholder',
						defaultValue: 'Choose an animal',
					}),
					booleanControl({
						prop: 'disabled',
						label: 'Disabled',
						defaultValue: false,
					}),
					booleanControl({
						prop: 'openOnFocus',
						label: 'Open on focus',
						defaultValue: false,
					}),
				],
			}),
		],
	}),
});
