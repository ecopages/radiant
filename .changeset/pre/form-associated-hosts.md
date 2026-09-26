---
'@ecopages/radiant-ui': minor
---

`rui-date-input`, `rui-number-field`, `rui-slider`, and `rui-knob` extend `FormAssociatedElement`. `FormAssociation` is removed; third-party hosts should extend the platform base. `RuiField` copies `disabled` onto a form-associated child and never names that host's inner input.
