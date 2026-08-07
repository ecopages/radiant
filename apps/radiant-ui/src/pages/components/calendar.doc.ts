import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	numberControl,
	selectControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "calendar",
	title: "Calendar",
	exportName: "RuiCalendar",
	category: "Data display",
	lede: "Calendars let users pick one or more dates from a month grid. They support single, multiple, and range selection without leaving the surrounding form.",
	usage: {
		intro: "Bind `value` as an ISO date string. Use `selectionMode` to switch between a single day, multiple days, or a start/end range.",
		example: `import { RuiCalendar } from '@ecopages/radiant-ui/calendar';

<RuiCalendar
  selectionMode="single"
  value="2026-08-07"
  min="2026-01-01"
  max="2026-12-31"
/>`,
	},
	guidance: [
  {
    id: "selection-modes",
    title: "Selection modes",
    paragraphs: [
      "`single` selects one date. `multiple` accepts comma-separated values. `range` expects `start/end` in `value`."
    ],
  },
  {
    id: "constrain-dates",
    title: "Constrain selectable dates",
    paragraphs: [
      "Set `min` and `max` to block out-of-range bookings or past dates. Pair with `visibleMonths` for multi-month range pickers."
    ],
  },
	],
	accessibility: [
   "Day cells expose grid semantics with arrow-key navigation between dates.",
   "Selected and today states are communicated with `aria-selected` and visible styling.",
   "Provide a visible label or `aria-label` when the calendar is not described by surrounding text."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       selectControl({
  prop: "selectionMode",
  label: "Selection mode",
  defaultValue: "single",
  options: [
    {
      value: "single",
      label: "Single"
    },
    {
      value: "multiple",
      label: "Multiple"
    },
    {
      value: "range",
      label: "Range"
    }
  ]
}),
       booleanControl({
  prop: "disabled",
  label: "Disabled",
  defaultValue: false
}),
       numberControl({
  prop: "visibleMonths",
  label: "Visible months",
  defaultValue: 1,
  min: 1,
  max: 3,
  step: 1
}),
       selectControl({
  prop: "pageBehavior",
  label: "Page behavior",
  defaultValue: "visible",
  options: [
    {
      value: "visible",
      label: "Visible"
    },
    {
      value: "single",
      label: "Single"
    }
  ]
})
     ]
   }),
		],
	}),
});
