---
'@ecopages/radiant': minor
---

`getReactiveMember` is now typed as a read-only `{ get, subscribe }` (it still returns the same object): write through the host field instead of `getReactiveMember(name).set(...)`. `registerReactiveMember` accepts such a read-only object, which drives `this.$`, `@onUpdated`, `@bindTo` and SSR preparation. `@prop`, `@state`, `@attr`, `@signal` and `createReactiveField` throw on a name held by a read-only member, and `registerReactiveMember` throws when a read-only member would replace the state behind a field that has an accessor (`@prop`, `@state`, `@attr`, `createReactiveField`).
