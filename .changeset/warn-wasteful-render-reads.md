---
'@ecopages/radiant': minor
---

Warn in development, once per class and field, when a `@state` or `@prop` field is bound with `this.$` and also read in `render()`, and when one such field re-runs a host's `render()` 30 times within a second. Both warnings name the field and the host and point to `this.$`; a plain direct read in `render()` does not warn.
