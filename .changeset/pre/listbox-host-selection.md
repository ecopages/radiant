---
'@ecopages/radiant-ui': minor
---

Unify listbox-backed selection across select, combobox, and standalone listbox with shared host controllers and consistent field labeling.

- Add `ListboxHostController` and `listbox-option` helpers for embedded listbox sync, comma-separated values, and tag-group chips.
- Export `@ecopages/radiant-ui/icons` with `RuiIconCheck` and `RuiIconX`; use them in listbox, select, combobox, tag-group, dialog, and toast.
- Wire `RuiField` labels to composed controls through `aria-labelledby`, including listbox surfaces in form fields.
