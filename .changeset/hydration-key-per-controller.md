---
'@ecopages/radiant': minor
---

Scope `@provideContext` and `@signal` hydration scripts by controller, so several controllers on one element, or a controller and the element host, no longer read each other's payload. A script written for a controller registered with `@controller('id')` now carries `data-hydration-key="id:field"` instead of the bare field name; an element host keeps the bare key. Update hand-written controller scripts to the new key, or emit them with `renderHydrationScriptTag()`, and regenerate cached or prerendered controller HTML: a script with the old key is no longer found, and the provider keeps its `initialValue`.
