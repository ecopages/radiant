---
'@ecopages/radiant-ui': patch
---

`rui-toaster` clears its live region and sets the new text after a short gap, so repeated toasts, toasts updated in place (such as `toast.promise()` resolving) and toasts shown together are announced; a toast that turns into an error in place is announced from an assertive region. A toast accepts `announcement` (plain announcement text) and `closeLabel` (close button name, default `Close toast`); `rui-toast` takes `close-label`.
