import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "switch",
	title: "Switch",
	exportName: "RuiSwitch",
	category: "Forms",
	lede: "Switches toggle a single setting on or off with immediate effect — notifications, dark mode, or feature flags.",
	usage: {
		intro: "Bind `checked` for controlled state. Place inside `RuiField` with a `RuiLabel` that describes what the switch controls.",
		example: `import { RuiSwitch } from '@ecopages/radiant-ui/switch';
import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';

<RuiField name="notifications">
  <RuiLabel>Email notifications</RuiLabel>
  <RuiSwitch checked={enabled} name="notifications" />
</RuiField>`,
	},
	guidance: [
  {
    id: "switch-vs-checkbox",
    title: "Switch vs checkbox",
    paragraphs: [
      "Use switches for settings that take effect immediately. Use checkboxes for options collected on form submit."
    ],
  },
	],
	accessibility: [
   "Switches expose `role=\"switch\"` with `aria-checked`.",
   "Labels must describe the setting, not the control — \"Email notifications\", not \"Toggle\".",
   "Space toggles the switch when focused."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       booleanControl({
  prop: "checked",
  label: "Checked",
  defaultValue: false
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
