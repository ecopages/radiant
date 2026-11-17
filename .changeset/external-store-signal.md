---
'@ecopages/signals': minor
---

Add `fromExternalStore(...)` so a Zustand, Redux, or `useSyncExternalStore` store can be a read-only signal. Select a slice, subscribe while something is listening, and paint `getServerSnapshot()` until the client takes over. Writes stay on the store.
