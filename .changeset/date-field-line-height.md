---
'@ecopages/radiant-ui': patch
---

The date field, date range picker and number field take their font size from `--text-control-input` and inherit the line height instead of applying `text-sm`, so their text sits on the same 21px line as the text input and the date input, and follows the larger mobile input size.
