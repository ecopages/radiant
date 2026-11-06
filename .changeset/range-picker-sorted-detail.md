---
'@ecopages/radiant-ui': patch
---

`rui-date-range-picker` now emits `start` and `end` in `rui-change` sorted the same way as `value`, so a handler never stores an inverted range.
