---
'@ecopages/jsx': minor
---

Type `prop:*` bindings only for writable instance properties. Readonly fields and getters without a setter no longer type-check, since assigning them throws or replaces state the element owns. Function components no longer have their source stringified on every render to tell them from classes, and a rejected customized built-in names its class and tag.
