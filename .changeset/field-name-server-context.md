---
'@ecopages/radiant-ui': patch
---

Name controls in server markup from the nearest Field or Checkbox Group while each control serializes, through the new `submissionContext`. A control in a nested Field takes the nearest Field's name, and a Field no longer adopts a control that belongs to a nested Field. A control registered with `registerFieldControl` that submits natively is no longer named by the Field in server markup: call `registerSubmissionForSsr(this)` in its constructor, which needs a `name` property bound to the input it submits through. Both are exported from `@ecopages/radiant-ui/form`.
