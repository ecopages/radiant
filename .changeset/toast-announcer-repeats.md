---
'@ecopages/radiant-ui': patch
---

`rui-toaster` clears its live region and sets the new text after a short gap, so repeated toasts, toasts updated in place (such as `toast.promise()` resolving) and toasts shown together are announced. A toast accepts `announcement` (plain announcement text) and `aria.closeLabel` (close button name, default `Close toast`); `rui-toast` takes `close-label`.
