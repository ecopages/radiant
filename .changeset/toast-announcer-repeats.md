---
'@ecopages/radiant-ui': patch
---

`rui-toaster` clears then sets its live region so repeated and same-tick toasts are announced. A toast accepts `announcement` (plain announcement text) and `aria.closeLabel` (close button name, default `Close toast`).
