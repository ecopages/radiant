---
'@ecopages/radiant': minor
---

Add `@ref` and `@refAll`, the decorators for the `data-ref` parts a host owns. `@ref()` reads the first owned part or `null`, `@refAll()` every owned part in document order, live on every read and `null` or `[]` before connect. Without a name the part name is the field name as an attribute name (`menubarRoot` finds `data-ref="menubar-root"`); `@ref('l1234')` uses the name as written, and `{ required: true }` warns once in development when the part is still missing after first connect. More than one part under one name in a host's scope warns once in development. Under standard decorators the field must accept `null` for `@ref` and be an array for `@refAll`. They work on `RadiantElement` and `RadiantController`, and resolve against the DOM shim on the server.
