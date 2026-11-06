---
'@ecopages/radiant-ui': patch
---

`rui-window-splitter` falls back to 50 when `value` is not a number instead of writing `NaN` to `aria-valuenow` and the pane size.
