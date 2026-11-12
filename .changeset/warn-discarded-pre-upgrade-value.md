---
'@ecopages/radiant': patch
---

In development, `@state` and `@signal` now warn when a value was assigned to the element before it was upgraded. They are internal members, so the value was always discarded in favour of the initializer; the warning names the member and points to `@prop`, which accepts a value set before upgrade. Production builds drop the warning.
