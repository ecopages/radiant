import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	numberControl,
	textControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "meter",
	title: "Meter",
	exportName: "RuiMeter",
	category: "Feedback",
	lede: "Meters display a scalar value within a known range — storage used, quiz score, or battery level — without implying user input.",
	usage: {
		intro: "Set `value`, `min`, and `max` to define the range. Add `label` text so the measurement is self-explanatory.",
		example: `import { RuiMeter } from '@ecopages/radiant-ui/meter';

<RuiMeter value={72} min={0} max={100} label="Storage used" />`,
	},
	guidance: [
  {
    id: "meter-vs-progress",
    title: "Meter vs progress bar",
    paragraphs: [
      "Use Meter for static measurements. Use a progress element when showing completion of an in-flight task."
    ],
  },
	],
	accessibility: [
   "Meters expose `role=\"meter\"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.",
   "Include a text label describing what is being measured.",
   "Supplement the bar with a numeric value when precision matters."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       numberControl({
  prop: "value",
  label: "Value",
  defaultValue: 72,
  min: 0,
  max: 100,
  step: 1
}),
       numberControl({
  prop: "min",
  label: "Min",
  defaultValue: 0,
  min: 0,
  max: 100,
  step: 1
}),
       numberControl({
  prop: "max",
  label: "Max",
  defaultValue: 100,
  min: 0,
  max: 100,
  step: 1
}),
       textControl({
  prop: "label",
  label: "Label",
  defaultValue: "Storage used"
})
     ]
   }),
		],
	}),
});
