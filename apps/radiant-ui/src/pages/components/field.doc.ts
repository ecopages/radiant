import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	textControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "field",
	title: "Field",
	exportName: "RuiField",
	category: "Forms",
	lede: "Fields wrap a single form control with label, description, and error messaging in a consistent layout.",
	usage: {
		intro: "Set `name` on `RuiField` to wire validation through `RuiForm`. Place a Radiant control (`RuiInput`, `RuiSelect`, `RuiSwitch`, …) as the child — Field discovers controls via `data-rui-control` and known host tags, not bare `<input>` elements. Use `RuiFieldDescription` and `RuiFieldError` for helper and error text.",
		example: `import { RuiField, RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiInput } from '@ecopages/radiant-ui/input';

<RuiField name="email" invalid={!!errors.email} error={errors.email?.message}>
  <RuiLabel>Email</RuiLabel>
  <RuiInput type="email" placeholder="you@example.com" />
  <RuiFieldDescription>We will never share your email.</RuiFieldDescription>
  <RuiFieldError />
</RuiField>`,
	},
	guidance: [
  {
    id: "library-controls",
    title: "Use Radiant controls",
    paragraphs: [
      "`RuiField` only wires library controls: presentational ones marked with `data-rui-control` (`RuiInput`, `RuiTextarea`, select triggers) and host elements such as `rui-select`, `rui-switch`, and `rui-date-field`. Bare `<input>` / `<textarea>` without the marker are ignored."
    ],
  },
  {
    id: "error-display",
    title: "Surface errors inline",
    paragraphs: [
      "Set `invalid` and pass the error message so `RuiFieldError` renders below the control with `aria-live` semantics."
    ],
  },
  {
    id: "disabled-fields",
    title: "Disabled fields",
    paragraphs: [
      "Set `disabled` on the field to dim the label and prevent interaction with nested controls."
    ],
  },
	],
	accessibility: [
   "Associate labels with controls using `RuiLabel` — do not rely on placeholder text alone.",
   "Error messages are linked to the input via `aria-describedby`.",
   "Descriptions provide supplementary context without replacing the label."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       textControl({
  prop: "name",
  label: "Name",
  defaultValue: "email"
}),
       booleanControl({
  prop: "disabled",
  label: "Disabled",
  defaultValue: false
}),
       booleanControl({
  prop: "invalid",
  label: "Invalid",
  defaultValue: false
}),
       textControl({
  prop: "error",
  label: "Error message",
  defaultValue: ""
})
     ]
   }),
		],
	}),
});
