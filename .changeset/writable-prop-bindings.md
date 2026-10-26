---
'@ecopages/jsx': minor
---

**Breaking:** `prop:*` bindings type-check only for writable instance properties. Readonly fields and getters without a setter are rejected, since assigning them throws or replaces state the element owns. To migrate, remove the binding or expose a writable property or setter.
