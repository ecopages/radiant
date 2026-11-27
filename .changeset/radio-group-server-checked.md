---
'@ecopages/radiant-ui': patch
'@ecopages/radiant': patch
---

Render `checked` on the radio that matches a `RuiRadioGroup` value in the server markup, so a form posted without JavaScript submits the selected value when the group, or a surrounding `RuiField`, has a `name`. `RuiField` now names a radio group's radios and a number field's input in the server markup. The server shim now reads an `input` value from its `value` attribute until it is assigned, and a `radio` or `checkbox` without one reads `on`. Assigning `input.value` on a `radio`, `checkbox`, `hidden`, `submit`, `reset`, `button` or `image` input writes the `value` attribute, as in a browser.
