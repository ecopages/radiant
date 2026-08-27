---
'@ecopages/radiant': patch
---

Stop the SSR light-DOM shim from recursing through `CSS.escape`, and make delegated `subscribeEvent(...)` matching ancestor-aware like `@onEvent`. Client ref selectors use native `CSS.escape`.
