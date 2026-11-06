---
'@ecopages/radiant-ui': patch
---

Table: in `selection-mode="single"`, Space on the selected row now deselects it and emits `rui-change` with an empty value, as it does in `multiple` mode. Clicking a cell still only selects.
