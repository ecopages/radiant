---
'@ecopages/radiant': minor
---

Batch `@onUpdated` into one update cycle per host, and keep a property write made before first-connect sync from being replaced by the authored attribute.

- `@onUpdated` runs once per cycle for the members it watches, before the render commits. `updated(changed)` runs after the commit. `updateComplete` resolves when the cycle finishes, including the first connect render.
- A property assigned before upgrade, or through its accessor before the connect sync, wins over the authored attribute.
