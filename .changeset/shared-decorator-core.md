---
'@ecopages/radiant': patch
---

Install `@query`, `@event`, `@attr`, and `@signal` the same way in both decorator modes, so a field reads `null` or its value before connect instead of `undefined` under legacy decorators.
