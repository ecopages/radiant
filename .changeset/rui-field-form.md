---
'@ecopages/radiant-ui': minor
---

Named `rui-date-input`, `rui-number-field`, `rui-slider`, and `rui-knob` are form-associated: `name` on the host submits through native `FormData` like `<input>`. Form reset restores the value the control was given. `RuiField` copies `name` onto that host and remains the `RuiForm` connector. Hidden form inputs on those hosts are gone.
