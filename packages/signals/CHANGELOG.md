# @ecopages/signals

## 0.11.2

### Patch Changes

- [#771](https://github.com/ecopages/radiant/pull/771) [`e7eab07`](https://github.com/ecopages/radiant/commit/e7eab07b4aac4911ebf87776027a031a1f32336f) Thanks [@andeeplus](https://github.com/andeeplus)! - Publish one file per source module so bundlers can tree-shake Radiant, JSX and Signals, and ship the JSX renderer only to apps that use JSX.

    - The dists are built with Rolldown `preserveModules` and keep `@__PURE__` annotations. `@ecopages/jsx` now declares `sideEffects`. Importing one decorator from `@ecopages/radiant` costs about 3 kB, not about 84 kB.
    - Radiant no longer imports the JSX DOM renderer. `@ecopages/jsx` installs it when `@ecopages/jsx/jsx-runtime` loads and on the first `jsx()` call, and Radiant reads it through `getDomRenderer()`, so existing apps need no changes. An element without a JSX view no longer bundles the renderer: the js-framework-benchmark `radiant` app drops from 92 kB to 47 kB. Without the renderer, a view that returns a plain value or a DOM node still renders; any other non-JSX view needs `import '@ecopages/jsx/jsx-runtime'` once, and `render()` throws an error naming it otherwise.
    - `ContextEventsTypes` from `@ecopages/radiant/context` is a constant object instead of a TypeScript `enum`. Values and the `ContextEventsTypes` type are unchanged; a member used as a type, such as `ContextEventsTypes.PROVIDER`, becomes `typeof ContextEventsTypes.PROVIDER`.
    - `@onEvent({ ref })` builds its part selector once per listener instead of on every event.
    - The Storybook SSR style walk in `@ecopages/storybook-radiant-vite` stops at modules it has already visited. An import cycle, which per-module packages can contain, made it recurse until the stack overflowed.

## 0.11.1

## 0.11.0

### Minor Changes

- [#767](https://github.com/ecopages/radiant/pull/767) [`59f2b21`](https://github.com/ecopages/radiant/commit/59f2b21fe77e9404652635741559a0f10b3e8dad) Thanks [@andeeplus](https://github.com/andeeplus)! - Add `fromExternalStore(store, select?)`, a read-only signal over a Zustand, Redux, or `useSyncExternalStore` store, and `@fromStore(store, select?)`, a host field that reads a slice of it. The host subscribes to the store only while it is connected, and server rendering paints `getServerSnapshot()` without subscribing. Writes stay on the store. A `@fromStore` field with an initializer warns in development, because the store replaces it. A host now holds any read-only member registered with `registerReactiveMember`, including the `this.$` bindings in its view, only while it is connected on the client.

    A signal or binding on a standard boolean attribute, such as `hidden={this.$.open}` or a store path, no longer re-runs the host's `render()`, or a computed that builds the element, when its value changes: creating the JSX tree no longer reads it. Each of its values now binds as a static value of the same type would, on the client, on the server and in hydration; before, its first value chose the binding for every later one. A host also releases the signals its view binds directly, such as a module-level signal, when it disconnects, and catches up when it reconnects, through `pauseSubscriptions` and `resumeSubscriptions`, hooks in `@ecopages/jsx` for a framework that owns a render target.

### Patch Changes

- [#750](https://github.com/ecopages/radiant/pull/750) [`6e7265e`](https://github.com/ecopages/radiant/commit/6e7265edd7b260060cef5e948bd6dfd47778ee0b) Thanks [@andeeplus](https://github.com/andeeplus)! - Make `subtle.Watcher.watch(...)` and a computed's first watch release what they started watching and rethrow the original error when a `watched` hook throws. A throwing `unwatched` hook no longer stops a release: every signal and dependency is released first, then the error is rethrown, several as an `AggregateError`.

- [#763](https://github.com/ecopages/radiant/pull/763) [`9bce50d`](https://github.com/ecopages/radiant/commit/9bce50d1567b72b3846b147a2323e10843f5ec53) Thanks [@andeeplus](https://github.com/andeeplus)! - Release each signal of `Watcher.unwatch` just before its own `unwatched` hook, so a hook that writes a signal listed after it still notifies the watcher, and `unwatch` re-arms the watcher whenever it leaves nothing pending, so a later change to a signal that is still watched notifies again. Errors from several failing `unwatched` hooks are now one flat `AggregateError` instead of an aggregate nested inside another.

## 0.10.0

### Minor Changes

- [#739](https://github.com/ecopages/radiant/pull/739) [`1052bcc`](https://github.com/ecopages/radiant/commit/1052bcc9312db7490ee264f5ca303a4c6912044a) Thanks [@andeeplus](https://github.com/andeeplus)! - Plain-object assignments to an existing store branch now preserve its identity and update only changed values. Arrays and non-plain values continue to be replaced.

### Patch Changes

- [#738](https://github.com/ecopages/radiant/pull/738) [`d787d54`](https://github.com/ecopages/radiant/commit/d787d54d9dd244280f6b2123cf57a1d2c54bacbd) Thanks [@andeeplus](https://github.com/andeeplus)! - Published type declarations now use explicit file extensions on relative imports, so TypeScript projects on `moduleResolution` `node16` or `nodenext` resolve the packages' types.

- [#726](https://github.com/ecopages/radiant/pull/726) [`c8239ff`](https://github.com/ecopages/radiant/commit/c8239ff1b73b5fa740b8cdf6479c3af6259a71ab) Thanks [@andeeplus](https://github.com/andeeplus)! - Update computed values and effects when a previously missing store key is added.

## 0.9.0

## 0.8.4

## 0.8.3

## 0.8.2

## 0.8.1

## 0.8.0

### Minor Changes

- [#632](https://github.com/ecopages/radiant/pull/632) [`6e98ef9`](https://github.com/ecopages/radiant/commit/6e98ef9ffd57ce38d5d92d15ddfb0bf6576ae49e) Thanks [@andeeplus](https://github.com/andeeplus)! - `mapItems(source, project)` maps each item of a list signal once, by identity, and reuses its result while the item stays in the list.

## 0.7.0

### Patch Changes

- [#587](https://github.com/ecopages/radiant/pull/587) [`28baef3`](https://github.com/ecopages/radiant/commit/28baef3940b6a6a5d4993d3909f787c2d3ef07f0) Thanks [@github-actions](https://github.com/apps/github-actions)! - Fix: `watch()` no longer calls `notify` when the watched value is equal, under `equals` (default `Object.is`), to the last value it delivered. A set followed by a set-back in the same tick used to notify with the same value as both arguments. A real change still notifies once.

## 0.6.0

## 0.5.1

## 0.5.0

## 0.4.0

## 0.3.0

First stable. Radiant hosts and JSX derivations use `State` and `computed` from this package. `@ecopages/radiant` depends on it directly; `@ecopages/jsx` takes it as a peer.
