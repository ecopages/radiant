---
'@ecopages/radiant-ui': patch
---

Open a `RuiCombobox` listbox when options that match the typed text are added to its popup after typing left nothing to show, so a typeahead that renders its suggestions after the `input` event opens it. A list the visitor selected from or dismissed stays closed. Add `refreshOptions()` to open it for the current options on demand.
