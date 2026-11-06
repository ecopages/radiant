---
'@ecopages/radiant-ui': patch
---

An `aria-disabled` tag in `rui-tag-group` cannot be removed: its remove control is disabled (also in the server-rendered `RuiTag`), and Delete and Backspace neither remove it nor prevent default.
