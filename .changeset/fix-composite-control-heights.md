---
'@ecopages/radiant-ui': patch
---

Composite controls (combobox, select, number field, date input, date field, date range picker, autocomplete and input group) now share `--size-control-md` with the text input. Their inner fields no longer add vertical padding on top of the minimum height, and the combobox, select and date field toggle buttons follow `--size-control-sm` instead of a fixed 2rem, so a theme with compact controls no longer renders them taller than a text input.
