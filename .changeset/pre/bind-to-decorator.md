---
'@ecopages/radiant': minor
---

Add `@bindTo` to copy a reactive field onto the host or a `data-ref` / selector descendant without a `render()` tree.

**@ecopages/radiant**

- `@bindTo(target)` or `@bindTo(target[])` writes `attr`, `bool`, `prop`, or `text` (optional `invert` / `map`). Omit `ref` and `selector` to patch the host (`this` / `this.element`).
- Flushes after attribute catch-up and the initial hydrate/update, before `onConnected()`, including on reconnect. Missing nodes and non-reactive fields are skipped.
- A target with zero or several write kinds, or both `ref` and `selector`, throws when the decorator is applied.
- Events stay `@onEvent`; procedures and derived state stay `@onUpdated`. Import from `@ecopages/radiant` or `@ecopages/radiant/decorators/bind-to`.
