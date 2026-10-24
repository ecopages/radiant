---
'@ecopages/radiant-ui': patch
---

Reject children on views whose element renders its own content. `RuiDateInput`, `RuiCalendar`, `RuiToaster`, `RuiToast`, `RuiToc` and `RuiMeter` accepted children and then dropped them, because the element's first render replaced them. Their props now type `children` as `never`, as do the helpers that forward to them: `RuiDateFieldInput`, `RuiDateFieldCalendar`, `RuiDateRangePickerStartInput`, `RuiDateRangePickerEndInput` and `RuiDateRangePickerCalendar`.

This is a type-only breaking change: no export is removed or renamed, and nothing changes at runtime. Code that passed children to one of these components now fails to type-check. Those children never rendered, so remove them, or render the content next to the component, for example a hint below `RuiDateInput`.
