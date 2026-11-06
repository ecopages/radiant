---
'@ecopages/radiant': patch
---

Fix: `@provideContext` hosts of one class no longer share a single `initialValue` object. Each provider now takes a shallow copy of a plain object or array, so writing to one host's `getContext()` does not change another's. Nested values are still shared.
