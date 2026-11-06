---
'@ecopages/jsx': patch
---

Mount templates faster on the client: each compiled template keeps a copy with its child markers already in place, so a new instance no longer replaces two comment markers per dynamic child or removes each attribute marker. Hydration is unchanged.
