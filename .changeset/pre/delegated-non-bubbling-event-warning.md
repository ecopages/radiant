---
'@ecopages/radiant': patch
---

Warn in dev when a delegated `@onEvent` subscribes to a non-bubbling event.

**@ecopages/radiant**

- Delegated `selector` / `ref` listeners attach on the host in the bubble phase, so `focus`, `blur`, `mouseenter`, and `mouseleave` never reach them. Registering one without `options: { capture: true }` now logs a dev warning suggesting the bubbling twin (`focusin`, `focusout`, `mouseover`, `mouseout`).
- `onEvent` event names now autocomplete bubbling event names while still accepting custom event strings; the union is exported as `DelegatedEventType`.
