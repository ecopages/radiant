import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	textControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "toolbar",
	title: "Toolbar",
	exportName: "RuiToolbar",
	category: "Actions",
	lede: "Toolbars group formatting or view controls that affect a shared context — rich text editors, chart controls, or data tables.",
	usage: {
		intro: "Place toggle `RuiButton` children inside `RuiToolbar`. Enable `exclusiveToggles` when only one toggle can be active.",
		example: `import { RuiToolbar } from '@ecopages/radiant-ui/toolbar';
import { RuiButton } from '@ecopages/radiant-ui/button';

<RuiToolbar label="Text formatting" exclusiveToggles>
  <RuiButton toggle pressed variant="ghost">Bold</RuiButton>
  <RuiButton toggle variant="ghost">Italic</RuiButton>
</RuiToolbar>`,
	},
	guidance: [
  {
    id: "exclusive-toggles",
    title: "Exclusive toggles",
    paragraphs: [
      "Use `exclusiveToggles` for view modes where only one option — list vs grid — can be active at a time."
    ],
  },
	],
	accessibility: [
   "Toolbar renders with `role=\"toolbar\"` and an accessible name from `label`.",
   "Toggle buttons expose `aria-pressed` for their on/off state.",
   "Arrow keys move between toolbar items when focus is inside the toolbar."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       booleanControl({
  prop: "exclusiveToggles",
  label: "Exclusive toggles",
  defaultValue: false
}),
       textControl({
  prop: "label",
  label: "Accessible name",
  defaultValue: "Text formatting"
})
     ]
   }),
		],
	}),
});
