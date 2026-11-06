---
'@ecopages/jsx': minor
---

**Breaking (types only):** `className` is a type error on intrinsic tags, custom elements included. On a native element it rendered as a `className` attribute, which browsers ignore, so the element had no class. To migrate, rename `className` to `class`.

At runtime, `className` on a native element is skipped instead of written, and development builds warn to use `class`. A custom element still receives it as a property.
