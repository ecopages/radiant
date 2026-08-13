---
'@ecopages/radiant': patch
---

Adopt authored reflected attributes before applying `defaultValue` on first connect.

**@ecopages/radiant**

- First-connect catch-up now runs before initial reflect/`@onUpdated`, so an authored attribute such as `variant="ghost"` is not overwritten by `defaultValue`.
