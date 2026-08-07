import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	numberControl,
	selectControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "slider",
	title: "Slider",
	exportName: "RuiSlider",
	category: "Forms",
	lede: "Sliders let users pick a numeric value or range along a track. They work well when the approximate value matters more than precise typing.",
	usage: {
		intro: "Set `min`, `max`, and `step` to define the range. Use `variant=\"range\"` with `rangeMin` and `rangeMax` for dual-thumb selection.",
		example: `import { RuiSlider } from '@ecopages/radiant-ui/slider';
import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';

<RuiField name="volume">
  <RuiLabel>Volume</RuiLabel>
  <RuiSlider variant="single" value={50} min={0} max={100} step={1} />
</RuiField>`,
	},
	guidance: [
  {
    id: "range-variant",
    title: "Range selection",
    paragraphs: [
      "Use `variant=\"range\"` for minimum/maximum filters. Set `minDistance` to prevent the thumbs from overlapping."
    ],
  },
  {
    id: "step-size",
    title: "Step size",
    paragraphs: [
      "Match `step` to meaningful increments — whole percentages, not arbitrary fractions."
    ],
  },
	],
	accessibility: [
   "Sliders expose `role=\"slider\"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.",
   "Pair with a visible label and optionally a live value readout.",
   "Arrow keys adjust the value; Page Up/Down jump by larger increments."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       selectControl({
  prop: "variant",
  label: "Variant",
  defaultValue: "single",
  options: [
    {
      value: "single",
      label: "Single"
    },
    {
      value: "range",
      label: "Range"
    }
  ]
}),
       numberControl({
  prop: "value",
  label: "Value",
  defaultValue: 50,
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
       numberControl({
  prop: "step",
  label: "Step",
  defaultValue: 1,
  min: 1,
  max: 10,
  step: 1
}),
       booleanControl({
  prop: "disabled",
  label: "Disabled",
  defaultValue: false
})
     ]
   }),
		],
	}),
});
