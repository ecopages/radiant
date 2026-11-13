---
'@ecopages/radiant-ui': minor
'@ecopages/radiant': minor
---

`rui-form` now validates against a form-associated control's own validity. A host that calls `ElementInternals.setValidity` blocks submission and shows its message in the field's error region; a rule or resolver message wins. `FormAssociatedElement` exposes `validity` and `validationMessage`, and `registerFieldControl` accepts an optional `validity` reader. A subclass that already declares its own `validity` or `validationMessage` member must rename it or match the new getter types.
