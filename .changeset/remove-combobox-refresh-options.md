---
'@ecopages/radiant-ui': minor
---

Remove `RuiCombobox.refreshOptions()`. Add late options to the existing listbox. Combobox observes those changes, filters the options, and opens the listbox when a focused query is waiting for matching results.
