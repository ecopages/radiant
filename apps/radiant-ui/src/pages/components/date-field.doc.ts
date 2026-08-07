import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	selectControl,
	textControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "date-field",
	title: "Date Field",
	exportName: "RuiDateField",
	category: "Forms",
	lede: "Date fields capture a single calendar date with locale-aware formatting and an optional calendar popup for pointer input.",
	usage: {
		intro: "Bind `value` as an ISO `YYYY-MM-DD` string. Use `dateStyle` to control how the formatted date appears in the input.",
		example: `import { RuiDateField } from '@ecopages/radiant-ui/date-field';
import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';

<RuiField name="startDate">
  <RuiLabel>Start date</RuiLabel>
  <RuiDateField value="2026-08-07" dateStyle="medium" />
</RuiField>`,
	},
	guidance: [
  {
    id: "masked-input",
    title: "Masked entry",
    paragraphs: [
      "`masked` guides segment-by-segment typing. Disable it when users paste full ISO strings from external tools."
    ],
  },
  {
    id: "min-max",
    title: "Bound the range",
    paragraphs: [
      "Set `min` and `max` to prevent invalid bookings. The embedded calendar inherits the same constraints."
    ],
  },
	],
	accessibility: [
   "Pair every date field with a visible `RuiLabel` or `aria-label`.",
   "Invalid dates should surface through `RuiField` error text, not color alone.",
   "Calendar popup content is reachable by keyboard from the trigger button."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       textControl({
  prop: "value",
  label: "Value (ISO)",
  defaultValue: "2026-08-07"
}),
       selectControl({
  prop: "dateStyle",
  label: "Date style",
  defaultValue: "medium",
  options: [
    {
      value: "short",
      label: "Short"
    },
    {
      value: "medium",
      label: "Medium"
    },
    {
      value: "long",
      label: "Long"
    },
    {
      value: "full",
      label: "Full"
    }
  ]
}),
       booleanControl({
  prop: "disabled",
  label: "Disabled",
  defaultValue: false
}),
       booleanControl({
  prop: "readOnly",
  label: "Read only",
  defaultValue: false
}),
       booleanControl({
  prop: "masked",
  label: "Masked",
  defaultValue: true
})
     ]
   }),
		],
	}),
});
