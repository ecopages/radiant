---
'@ecopages/signals': minor
'@ecopages/radiant': minor
---

Add `fromExternalStore(store, select?)`, a read-only signal over a Zustand, Redux, or `useSyncExternalStore` store, and `@fromStore(store, select?)`, a host field that reads a slice of it. The host subscribes to the store only while it is connected, and server rendering paints `getServerSnapshot()` without subscribing. Writes stay on the store. A host now holds any read-only member registered with `registerReactiveMember`, including the `this.$` bindings in its view, only while it is connected on the client.
