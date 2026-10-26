---
'@ecopages/radiant': patch
---

Resolve consumed SSR context before `renderComponent` and `renderController` initialization callbacks, so `initialize` sees the value from `ssrContext` or the active provider again. The host still receives that context once: one `connectedContextCallback`, one mounted event and one context update callback per provider and value.
