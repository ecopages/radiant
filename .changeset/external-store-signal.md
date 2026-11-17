---
'@ecopages/signals': minor
'@ecopages/radiant': minor
---

Add `fromExternalStore(...)` so a Zustand, Redux, or `useSyncExternalStore` store can be a read-only signal, and `@fromStore(store, select)` so a Radiant host field reads a slice of it. Select a slice, subscribe while the host is connected, and paint `getServerSnapshot()` until the client takes over. Writes stay on the store.
