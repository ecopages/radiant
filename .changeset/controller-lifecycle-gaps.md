---
'@ecopages/radiant': minor
---

Fix controller and host lifecycle gaps.

- A controller `@signal` with `hydrate` now restores its value from its scoped `id:field` hydration script under the controller's host element.
- Under legacy decorators, `@controller` now wraps the class so `@prop` is set up when the constructor ends, as `@customElement` does. A controller then follows the Element Host rules: a write after `new` wins over a value the host held, over the `defaultValue` and over the initializer, even when it equals the default or the prop has no `defaultValue`; the initializer is only the value when there is no `defaultValue` and the host held nothing. The write is reported once on first connect, a binding taken before connect keeps following the field, and props that were not written report nothing.
- Under legacy decorators, a controller class without `@controller` (including one passed to `registerController` directly) is set up at first connect, where any own `@prop` value is taken as the author's and wins over the host's value and the `defaultValue`.
- Development builds warn once per class and prop when a `@prop` has both a field initializer and a different `defaultValue` (the `defaultValue` wins). Set one, not both. Production builds drop the warning.
- Under legacy decorators, server rendering a controller resolves a declared but unassigned `@prop` to its `defaultValue` instead of `undefined`.
- A connection callback that disconnects a host no longer lets the connect pass paint `@bindTo`, render, or run `updated()`; one that disconnects and reconnects it runs the connect work once, on both controllers and elements.
- Initial update emits no longer run `@bindTo` and `registerUpdateCallback` callbacks while the host is not connected, so the first connect paints `@bindTo` once.
- During connect, a write to a member made by an update callback reaches that member's callbacks once. A callback that disconnects the host stops the remaining callbacks of that member, and one unregistered earlier in the pass is skipped.
