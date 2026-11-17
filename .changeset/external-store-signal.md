---
'@ecopages/signals': minor
'@ecopages/radiant': minor
'@ecopages/jsx': minor
---

Add `fromExternalStore(store, select?)`, a read-only signal over a Zustand, Redux, or `useSyncExternalStore` store, and `@fromStore(store, select?)`, a host field that reads a slice of it. The host subscribes to the store only while it is connected, and server rendering paints `getServerSnapshot()` without subscribing. Writes stay on the store. A `@fromStore` field with an initializer warns in development, because the store replaces it. A host now holds any read-only member registered with `registerReactiveMember`, including the `this.$` bindings in its view, only while it is connected on the client.

A signal or binding on a standard boolean attribute, such as `hidden={this.$.open}` or a store path, no longer re-runs the host's `render()` (or a computed that builds the element) when its value changes: creating the JSX tree no longer reads it, and it binds as an attribute on any element, present for `true`, absent for `false`, `null` or `undefined`, and the text for any other value. A true value renders as `hidden=""` on the server. A host also releases the signals its view binds directly, such as a module-level signal, when it disconnects, and catches up when it reconnects: `pauseSubscriptions` and `resumeSubscriptions` in `@ecopages/jsx` do this for any render target.
