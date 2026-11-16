---
'@ecopages/radiant': patch
---

Install `@query`, `@event`, `@attr`, and `@signal` the same way in both decorator modes. Under legacy decorators, a field on a `@customElement` class now reads `null` or its value right after construction instead of `undefined`. Legacy controller fields are still set up at `connect()`.
