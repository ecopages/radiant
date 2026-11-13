---
'@ecopages/radiant-ui': patch
---

`RuiNumberField` shows an empty field as empty instead of `0`, with no `aria-valuenow` and an empty form value, and commits a typed `0` by setting `value` and emitting `rui-change`. Stepping from empty still starts at `0` or `defaultValue`.
