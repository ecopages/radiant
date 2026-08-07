import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	textControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "dialog",
	title: "Dialog",
	exportName: "RuiDialog",
	category: "Overlays",
	lede: "Dialogs interrupt the page to capture a decision or short form. They trap focus and return it when dismissed.",
	usage: {
		intro: "Register dialogs with `installDialogs`, then open them imperatively via `openDialog` or a trigger with `data-dialog-open`. Compose title, body, and actions with the sub-components.",
		example: `import {
  RuiDialog,
  RuiDialogTitle,
  RuiDialogBody,
  RuiDialogActions,
  RuiDialogClose,
  installDialogs,
  openDialog,
} from '@ecopages/radiant-ui/dialog';

installDialogs();

<RuiDialog id="edit-profile" label="Edit profile">
  <RuiDialogTitle>Edit profile</RuiDialogTitle>
  <RuiDialogBody>Update your display name and email.</RuiDialogBody>
  <RuiDialogActions>
    <RuiDialogClose>Cancel</RuiDialogClose>
    <button type="button">Save</button>
  </RuiDialogActions>
</RuiDialog>`,
	},
	guidance: [
  {
    id: "alert-dialog",
    title: "Alert dialogs",
    paragraphs: [
      "Set `alert` to `true` for destructive confirmations. Alert dialogs limit tab order to the dialog actions."
    ],
  },
  {
    id: "focus-return",
    title: "Return focus on close",
    paragraphs: [
      "Focus returns to the element that opened the dialog. Avoid stacking multiple modal layers."
    ],
  },
	],
	accessibility: [
   "Every dialog needs an accessible name via `label` or `RuiDialogTitle`.",
   "Use `alert` for confirmations that require an explicit decision before continuing.",
   "Do not open a dialog without a clear way to dismiss it — provide a close action."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       booleanControl({
  prop: "open",
  label: "Open",
  defaultValue: false
}),
       booleanControl({
  prop: "alert",
  label: "Alert dialog",
  defaultValue: false
}),
       textControl({
  prop: "label",
  label: "Accessible name",
  defaultValue: "Edit profile"
})
     ]
   }),
		],
	}),
});
