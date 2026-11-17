---
'@ecopages/radiant': patch
---

Fix controller and host lifecycle gaps.

- A controller `@signal` with `hydrate` now restores its value from its scoped `id:field` hydration script under the controller's host element.
- Under legacy decorators, a controller `@prop` written before `connect()` keeps its value and is reported once; a binding taken before connect keeps following the field. Props that were not written report nothing on first connect.
- Under legacy decorators, server rendering a controller resolves a declared but unassigned `@prop` to its `defaultValue` instead of `undefined`.
- A connection callback that disconnects a host no longer lets the connect pass paint `@bindTo`, render, or run `updated()`; one that disconnects and reconnects it runs the connect work once, on both controllers and elements.
- Initial update emits no longer run `@bindTo` and `registerUpdateCallback` callbacks while the host is not connected, so the first connect paints `@bindTo` once.
- During connect, a write to a member made by an update callback reaches that member's callbacks once. A callback that disconnects the host stops the remaining callbacks of that member, and one unregistered earlier in the pass is skipped.
