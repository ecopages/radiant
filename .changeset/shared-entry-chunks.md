---
'@ecopages/radiant-ui': patch
---

Fix `registerFieldControl` not reaching `rui-field`, and `rui-checkbox-group` ignoring its checkboxes when the checkbox entry is imported first. Entries now share code through `dist/chunks/`; chunk file names are content hashes and must not be imported; use only the documented entries.
