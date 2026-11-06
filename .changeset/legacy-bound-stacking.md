---
'@ecopages/radiant': patch
---

Accept `@bound` below `@onEvent` or `@debounce` under legacy decorators. `@onEvent` no longer throws when the host initializes, and `@debounce` no longer throws when the class is defined; the handler and the debounced method stay bound to the host.
