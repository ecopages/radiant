---
'@ecopages/radiant': minor
---

`getReactiveMember` now returns a read-only `{ get, subscribe }` view: write through the host field instead of `getReactiveMember(name).set(...)`. `registerReactiveMember` accepts such a read-only object, which drives `this.$`, `@onUpdated`, `@bindTo` and SSR preparation. `@prop`, `@state`, `@attr`, `@signal` and `createReactiveField` throw on a name held by a read-only member.
