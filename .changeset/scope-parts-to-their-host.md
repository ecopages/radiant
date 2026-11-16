---
'@ecopages/radiant': minor
---

Scope `data-ref` parts to the host that owns them. `@query({ ref })`, `getRef` on `RadiantElement` and `RadiantController`, `@onEvent({ ref })` and `@bindTo({ ref })` now only see parts of the nearest enclosing upgraded Element Host or attached Controller Host, so an outer host no longer gets a nested host's part of the same name, and `all` leaves nested parts out. A part that is itself a nested host still belongs to the outer host. `@onEvent({ ref })` matches by containment: it fires for an event inside a part the host owns, skipping a same-named part that a nested host owns, so container parts keep hearing events from nested hosts that reuse the name. Part names with quotes or backslashes now resolve in every API, and the server DOM shim decodes escapes in quoted attribute values.

**Breaking:** an outer host can no longer reach a nested host's part through `ref`. Use `@query({ selector: '[data-ref="x"]' })`, `@onEvent({ selector })`, `@bindTo({ selector })` or `host.querySelector(...)` instead, which stay unscoped. `@onEvent({ ref })` also no longer fires for a `data-ref` on the host element itself.
