---
'@ecopages/radiant-ui': patch
---

Render the inner input of `RuiNumberField` with the field's `name`, raw `value`, `min`, `max` and `step` in the server markup, so a form posted without JavaScript submits the number when the field has a `name`. The host removes those attributes when it connects, so the number is submitted once. `min`, `max` and `step` have no effect on a text input.
