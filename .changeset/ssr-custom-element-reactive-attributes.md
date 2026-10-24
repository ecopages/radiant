---
'@ecopages/jsx': patch
---

Resolve reactive values before assigning them to SSR-capable custom-element instances, so their renderer can reflect current attribute and property state in plain and hydrate output instead of seeing reactive wrapper objects.
