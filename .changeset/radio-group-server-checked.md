---
'@ecopages/radiant-ui': patch
'@ecopages/radiant': patch
---

Render `checked` on the radio that matches a `RuiRadioGroup` value in the server markup, so a form posted without JavaScript submits the selected value when the group has a `name`. The server shim now reads an `input` value from its `value` attribute until it is assigned, and a `radio` or `checkbox` without one reads `on`.
