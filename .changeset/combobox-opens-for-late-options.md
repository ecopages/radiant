---
'@ecopages/radiant-ui': patch
---

Open a `RuiCombobox` listbox when options are added to its popup while the input has focus and text, so a typeahead that renders its suggestions after the `input` event opens it. Add `refreshOptions()` to run the same check after options change outside the popup.
