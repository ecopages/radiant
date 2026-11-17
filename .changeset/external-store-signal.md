---
'@ecopages/signals': minor
'@ecopages/radiant': minor
'@ecopages/jsx': minor
---

Add `fromExternalStore(store, select?)`, a read-only signal over a Zustand, Redux, or `useSyncExternalStore` store, and `@fromStore(store, select?)`, a host field that reads a slice of it. The host subscribes to the store only while it is connected, and server rendering paints `getServerSnapshot()` without subscribing. Writes stay on the store. A `@fromStore` field with an initializer warns in development, because the store replaces it. A host now holds any read-only member registered with `registerReactiveMember`, including the `this.$` bindings in its view, only while it is connected on the client.

A binding on a standard boolean attribute, such as `hidden={this.$.open}` or a store path, no longer re-runs the host's `render()` when its value changes, and neither does a signal passed directly there. `setUntrackedRead` in `@ecopages/jsx` lets a host runtime read such values untracked, and Radiant passes `untrack` from `@ecopages/signals`. A host also releases the signals its view binds directly, such as a module-level signal, when it disconnects, and catches up when it reconnects: `pauseSubscriptions` and `resumeSubscriptions` in `@ecopages/jsx` do this for any render target.
