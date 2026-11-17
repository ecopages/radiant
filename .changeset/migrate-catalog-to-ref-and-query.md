---
'@ecopages/radiant-ui': patch
---

Read catalog parts with `@ref`, `@refAll`, `@query(selector)` and `@queryAll(selector)` instead of the `@query` options object. Public types are unchanged; the one behavior change is that a host no longer reads a nested catalog host's same-named `data-ref` part.
