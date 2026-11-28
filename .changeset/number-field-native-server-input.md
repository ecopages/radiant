---
'@ecopages/radiant-ui': patch
---

Render Number Field as `type="number"` on the server, so the browser enforces numeric entry and `min` and `max` before JavaScript loads. The input's `step` is `any`, so a bound that is off the step still posts; the host snaps to its step once it connects. When the host connects it adopts a number edited before then, read from the browser's parsed value, and switches to locale-formatted text. Locale-formatted text such as `1.234,57` typed before the script loads is no longer read. The native spin buttons are hidden. Custom `[data-number-field-input]` markup must author `type="number"`.
