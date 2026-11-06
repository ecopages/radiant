---
'@ecopages/radiant-ui': patch
---

Toast: the `error` variant now renders with `role="alert"`, `aria-live="assertive"` and `aria-atomic="true"`, as the docs state. Other variants keep `role="status"`.
