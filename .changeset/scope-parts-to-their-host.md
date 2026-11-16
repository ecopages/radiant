---
'@ecopages/radiant': minor
---

Scope `data-ref` parts to the host that owns them. `@query({ ref })`, `getRef` on `RadiantElement` and `RadiantController`, `@onEvent({ ref })` and `@bindTo({ ref })` now share one resolver: a part belongs to the nearest enclosing upgraded Element Host or attached Controller Host, so an outer host no longer gets a nested host's part of the same name, and `all` leaves nested parts out. A part that is itself a nested host still belongs to the outer host. Lookups stay live, and the part name is escaped in every API. Breaking: code that reached a nested host's part through `ref` must use `@query({ selector })`, which stays unscoped.
