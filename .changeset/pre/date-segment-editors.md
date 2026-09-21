---
'@ecopages/radiant-ui': minor
---

Date fields and range pickers now use React Aria-style locale segments instead of a single formatted text box, so tapping a unit replaces just that part and mobile keyboards stay numeric.

**@ecopages/radiant-ui**

- `RuiDateField` and `RuiDateRangePicker` embed `rui-date-input`; removed `dateStyle`, `masked`, and string `placeholder` props from those hosts.
- Nested range inputs keep in-progress dates until both sides are valid; the host `value` is the committed `start/end` range only.
- Light-DOM contract: `[data-date-field-input]` and `[data-range-start]` / `[data-range-end]` are nested `rui-date-input` hosts, not `<input type="text">`.
