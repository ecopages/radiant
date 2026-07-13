---
'@ecopages/jsx': minor
'@ecopages/radiant': minor
---

Back reactive host members with signals `State` and wire jsx derived bindings through signals `computed`.

**@ecopages/jsx**

- Add `@ecopages/signals` as a peer dependency.
- `mapSubscribable` now builds signal-backed derivations with `computed` when the source is a `SignalLike` (pull/push remains for `SubscribableJsxValue` adapters).

**@ecopages/radiant**

- Add `@ecopages/signals` as a direct dependency (no longer peer-only).
- Removed `trackReactiveRead` and `registerReactiveDependencyReader` from `RadiantElement` and `RadiantController`. Host members are now signals-backed; dependency tracking is native via `State.get()`.
- Legacy `@state` / `@prop` decorators now register member `State` during post-construction (SSR and connect), matching standard decorator timing.
- Legacy `@prop` SSR staging honors pre-render property assignments while connect-time initialization still prefers explicit `defaultValue` over class field initializers.
- Added `createReactiveMember`, `registerReactiveMember`, and `getReactiveMember` for advanced host integrations.
- Removed exported `ReactiveField` metadata type; use `createReactiveField` / `@state` instead.

Decorator APIs (`@state`, `@prop`, `@attr`, `@onUpdated`, `signal()`, `registerUpdateCallback`) are unchanged.
