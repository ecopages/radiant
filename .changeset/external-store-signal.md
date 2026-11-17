---
'@ecopages/signals': minor
'@ecopages/radiant': minor
'@ecopages/jsx': minor
---

Add `fromExternalStore(store, select?)`, a read-only signal over a Zustand, Redux, or `useSyncExternalStore` store, and `@fromStore(store, select?)`, a host field that reads a slice of it. The host subscribes to the store only while it is connected, and server rendering paints `getServerSnapshot()` without subscribing. Writes stay on the store. A `@fromStore` field with an initializer warns in development, because the store replaces it. A host now holds any read-only member registered with `registerReactiveMember`, including the `this.$` bindings in its view, only while it is connected on the client.

A signal or binding on a standard boolean attribute, such as `hidden={this.$.open}` or a store path, no longer re-runs the host's `render()`, or a computed that builds the element, when its value changes: creating the JSX tree no longer reads it. Each of its values now binds as a static value of the same type would, on the client, on the server and in hydration; before, its first value chose the binding for every later one. A host also releases the signals its view binds directly, such as a module-level signal, when it disconnects, and catches up when it reconnects, through `pauseSubscriptions` and `resumeSubscriptions`, hooks in `@ecopages/jsx` for a framework that owns a render target.
