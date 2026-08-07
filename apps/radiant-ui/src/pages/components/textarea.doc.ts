import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	numberControl,
	selectControl,
	textControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "textarea",
	title: "Textarea",
	exportName: "RuiTextarea",
	category: "Forms",
	lede: "Textareas capture multi-line text — descriptions, comments, and messages — with configurable row height.",
	usage: {
		intro: "Wrap in `RuiField` with a label. Set `rows` for initial height and `size` for typography scale.",
		example: `import { RuiTextarea } from '@ecopages/radiant-ui/textarea';
import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';

<RuiField name="bio">
  <RuiLabel>Bio</RuiLabel>
  <RuiTextarea rows={4} size="md" placeholder="Tell us about yourself" />
</RuiField>`,
	},
	guidance: [
  {
    id: "row-count",
    title: "Set initial rows",
    paragraphs: [
      "Match `rows` to the expected content length. Short notes need fewer rows than essay-length fields."
    ],
  },
	],
	accessibility: [
   "Every textarea needs a visible label via `RuiLabel`.",
   "Character limits should be announced and visible, not hidden until exceeded.",
   "Disabled textareas should explain why editing is unavailable."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       selectControl({
  prop: "size",
  label: "Size",
  defaultValue: "md",
  options: [
    {
      value: "sm",
      label: "Small"
    },
    {
      value: "md",
      label: "Medium"
    },
    {
      value: "lg",
      label: "Large"
    }
  ]
}),
       numberControl({
  prop: "rows",
  label: "Rows",
  defaultValue: 3,
  min: 2,
  max: 12,
  step: 1
}),
       booleanControl({
  prop: "disabled",
  label: "Disabled",
  defaultValue: false
}),
       textControl({
  prop: "placeholder",
  label: "Placeholder",
  defaultValue: "Tell us about yourself"
})
     ]
   }),
		],
	}),
});
