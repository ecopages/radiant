---
'@ecopages/radiant-ui': patch
---

`rui-slider` updates `value` before it dispatches its events, on every move. Before, a keyboard step or a drag emitted while `value` still held the previous value, so a `rui-field` wrote that stale value to its form. A cancelled drag restores `value` and emits the restored value.
