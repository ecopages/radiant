---
'@ecopages/radiant-ui': patch
---

Add `HotkeyController` and `createHotkeyController` to `@ecopages/radiant-ui/controllers`: a handler per key string such as `mod+k`, `shift+ArrowLeft` or `Space` on a target, skipping text fields, composing and keys another handler already prevented, with an optional capture phase.
