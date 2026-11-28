---
'@ecopages/radiant-ui': patch
---

Render Number Field as `type="number"` on the server, so the browser enforces numeric entry and `min`, `max` and `step` before JavaScript loads. When the host connects it adopts a number edited before then, read from the browser's parsed value, and switches to locale-formatted text. Locale-formatted text such as `1.234,57` typed before the script loads is no longer read.
