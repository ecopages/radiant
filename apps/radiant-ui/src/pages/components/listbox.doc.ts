import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	textControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "listbox",
	title: "Listbox",
	exportName: "RuiListbox",
	category: "Forms",
	lede: "Listboxes present a scrollable set of options with single or multiple selection. They are the foundation for select, combobox, and autocomplete popups.",
	usage: {
		intro: "Add `RuiListboxOption` children with unique `value` props. Bind `value` on the listbox for controlled selection.",
		example: `import { RuiListbox, RuiListboxOption } from '@ecopages/radiant-ui/listbox';

<RuiListbox value="cat" label="Animal">
  <RuiListboxOption value="cat">Cat</RuiListboxOption>
  <RuiListboxOption value="dog">Dog</RuiListboxOption>
</RuiListbox>`,
	},
	guidance: [
  {
    id: "embedded-mode",
    title: "Embedded listboxes",
    paragraphs: [
      "Set `embedded` when the listbox lives inside a combobox or select popup rather than inline on the page."
    ],
  },
	],
	accessibility: [
   "Options expose `role=\"option\"` with `aria-selected` for the current choice.",
   "Arrow keys move focus between options; type-ahead jumps to matching entries.",
   "Provide a `label` or external heading so users know what the list represents."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       textControl({
  prop: "value",
  label: "Value",
  defaultValue: "cat"
}),
       booleanControl({
  prop: "disabled",
  label: "Disabled",
  defaultValue: false
}),
       booleanControl({
  prop: "embedded",
  label: "Embedded",
  defaultValue: false
}),
       textControl({
  prop: "label",
  label: "Label",
  defaultValue: "Animal"
})
     ]
   }),
		],
	}),
});
