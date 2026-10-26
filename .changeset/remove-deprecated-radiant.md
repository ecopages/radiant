---
'@ecopages/radiant': minor
---

**Breaking:** Remove two deprecated surfaces.

- The `@ecopages/radiant/server/radiant-element-ssr-bridge` entry is gone. Import from `@ecopages/radiant/server/radiant-element-ssr`, which exports the same names.
- `@contextSelector(...)` decorates fields only. On a method it no longer type-checks and throws a `TypeError` naming `@onContextUpdate`, in standard and legacy decorator modes. Replace `@contextSelector({ context, select })` on a method with `@onContextUpdate({ context, select })`; it runs the same delivery, so the method behaves as before.
