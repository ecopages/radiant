---
'@ecopages/radiant-ui': patch
---

Set the native `readonly` attribute on the Number Field input when the host is read-only, in server markup and in the browser, so the browser no longer allows edits. The host now owns `readonly`, so set `readOnly` on the host rather than on `RuiNumberFieldInput`.
