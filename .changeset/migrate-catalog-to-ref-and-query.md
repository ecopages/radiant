---
'@ecopages/radiant-ui': patch
---

Read catalog parts with `@ref`, `@refAll`, `@query(selector)` and `@queryAll(selector)` instead of the `@query` options object. Public behavior and types are unchanged. A host no longer reads a nested catalog host's same-named `data-ref` part.
