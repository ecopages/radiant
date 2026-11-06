---
'@ecopages/radiant-ui': patch
---

Tag group: a `disabled` group no longer removes tags. The remove control, Delete and Backspace are now no-ops and emit neither `rui-remove` nor `rui-change`, as the docs state.
