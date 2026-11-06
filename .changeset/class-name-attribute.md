---
'@ecopages/jsx': minor
---

**Breaking:** `className` on a native element is a type error and is no longer rendered. It used to render as a `className` attribute, which browsers ignore, so the element had no class. To migrate, rename `className` to `class`.

`jsxDEV` from `@ecopages/jsx/jsx-dev-runtime` warns once per tag when a native element gets `className`. A custom element still receives `className` as a property.
