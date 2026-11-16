---
'@ecopages/radiant': minor
---

Accept a read-only `{ get, subscribe }` object in `registerReactiveMember`, so `this.$`, `@onUpdated`, `@bindTo` and SSR preparation work on it, and make `getReactiveMember` return that read-only view: write through the host field instead of `getReactiveMember(name).set(...)`. `@prop`, `@state`, `@attr`, `@signal` and `createReactiveField` now throw on a name held by a read-only member. `ReadonlyReactiveState` is the new base of `ReactiveState`.
