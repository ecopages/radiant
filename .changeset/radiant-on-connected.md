---
'@ecopages/radiant': minor
---

Add `protected onConnected()` on `RadiantElement` for post-catch-up connect work. Override it instead of `connectedCallback` + `queueMicrotask(sync)` so authored attributes and the initial hydrate/update are visible; it runs on every connection.

**@ecopages/radiant**

- `onConnected()` fires after first-connect attribute catch-up and, when `render()` is overridden, after the initial hydrate/update. Rebuild work torn down in `disconnectedCallback` here; guard once-only bootstrapping with an explicit flag.
- This is not `registerConnectedCallback()`, which still runs synchronously at the start of `connectedCallback`.
