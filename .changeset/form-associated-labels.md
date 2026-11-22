---
'@ecopages/radiant': minor
---

`FormAssociatedElement` exposes `labels`, the `<label>` elements associated with the host through `ElementInternals.labels` (a `<label for="host-id">` or a `<label>` ancestor), or `undefined` on the server. A host whose accessible role lives on an inner part can forward them to that part's `aria-labelledby`.
