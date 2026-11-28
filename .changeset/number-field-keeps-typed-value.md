---
'@ecopages/radiant-ui': patch
---

Keep the number a visitor typed into a server-rendered `RuiNumberField` before its script loaded. The host used to rewrite the input from its `value` or `defaultValue` when it connected, so the edit was lost and a form posted the initial value. It now adopts the typed text as the value, parsed in the field's locale and snapped or validated as a blur would; text the field rejects, or an input emptied before the upgrade, leaves the server value, and an input nobody touched keeps it.
