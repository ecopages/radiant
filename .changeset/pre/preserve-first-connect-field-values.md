---
'@ecopages/radiant': patch
'@ecopages/radiant-ui': patch
---

Keep an authored `value` through custom-element first-connect, and apply field defaults to composed select and combobox.

**@ecopages/radiant**

- A property assigned before upgrade, or an attribute set before first connect, is no longer replaced by an empty reflected `defaultValue`.

**@ecopages/radiant-ui**

- `RuiField` writes defaults to the composed select or combobox host. An embedded listbox is the parent's option surface, not a separate field control.
