---
'@ecopages/radiant': minor
---

Reject customized built-in definitions in `@customElement`.

Passing a defined `extends` value now throws a `TypeError` and no longer type-checks. Use an autonomous custom element instead.
