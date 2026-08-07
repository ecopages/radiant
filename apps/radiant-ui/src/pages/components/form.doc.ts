import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	selectControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "form",
	title: "Form",
	exportName: "RuiForm",
	category: "Forms",
	lede: "Forms coordinate validation, default values, and submission across `RuiField` children without external form libraries.",
	usage: {
		intro: "Wrap fields in `RuiForm` and handle `on:submit` with validated values. Choose `mode` to control when validation runs.",
		example: `import { RuiForm } from '@ecopages/radiant-ui/form';
import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiButton } from '@ecopages/radiant-ui/button';

<RuiForm mode="onSubmit" on:submit={handleSubmit}>
  <RuiField name="name" rules={{ required: 'Name is required' }}>
    <RuiLabel>Full name</RuiLabel>
    <RuiInput />
  </RuiField>
  <RuiButton type="submit">Create account</RuiButton>
</RuiForm>`,
	},
	guidance: [
  {
    id: "validation-mode",
    title: "Validation timing",
    paragraphs: [
      "`onSubmit` validates once on submit — best for short forms. Use `onBlur` or `onChange` when immediate feedback helps data entry."
    ],
  },
  {
    id: "radiant-controls",
    title: "Compose with Radiant controls",
    paragraphs: [
      "Every `RuiField` child should be a Radiant control (`RuiInput`, `RuiSelect`, `RuiDateField`, …). The form store discovers values through the Field control protocol — unmarked native inputs are not registered."
    ],
  },
  {
    id: "default-values",
    title: "Default values",
    paragraphs: [
      "Pass `defaultValues` to pre-populate edit forms. Fields read their initial state from the form store."
    ],
  },
	],
	accessibility: [
   "Submit buttons should use `type=\"submit\"` inside the form for keyboard submission.",
   "Announce form-level errors at the top when multiple fields fail validation.",
   "Focus the first invalid field after a failed submit attempt."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       selectControl({
  prop: "mode",
  label: "Validation mode",
  defaultValue: "onSubmit",
  options: [
    {
      value: "onSubmit",
      label: "On submit"
    },
    {
      value: "onBlur",
      label: "On blur"
    },
    {
      value: "onChange",
      label: "On change"
    },
    {
      value: "onTouched",
      label: "On touched"
    },
    {
      value: "all",
      label: "All"
    }
  ]
})
     ]
   }),
		],
	}),
});
