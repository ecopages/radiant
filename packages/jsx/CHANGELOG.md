# @ecopages/jsx

## 0.3.0-beta.5

### Patch Changes

- Updated dependencies []:
    - @ecopages/signals@0.3.0-beta.5

## 0.3.0-beta.4

### Patch Changes

- [#74](https://github.com/ecopages/radiant/pull/74) [`beffbbd`](https://github.com/ecopages/radiant/commit/beffbbdf72b6d8353b687e8015089b6d643b867f) Thanks [@andeeplus](https://github.com/andeeplus)! - Serialize reactive `style` object snapshots when applying attributes and during SSR, so callers can bind object styles through signals and subscribables without manual CSS strings.

- [#65](https://github.com/ecopages/radiant/pull/65) [`ba60c0a`](https://github.com/ecopages/radiant/commit/ba60c0a4336d47ede31d6540c4fb15fcc284733a) Thanks [@andeeplus](https://github.com/andeeplus)! - Move SSR ambient render state to Node `AsyncLocalStorage` and keep client bundles free of the JSX server entry.

    **@ecopages/jsx**

    - `@ecopages/jsx/server` is Node-only and stores active SSR render scope in `AsyncLocalStorage` (no sync / browser fallback stack).
    - Add `getActiveSsrScopeValue` / `withActiveSsrScopeValue` for framework-scoped SSR state on the active render scope.
    - `withForcedServerCustomElementRendering` has been removed; custom-element SSR is handled by the server-render pipeline directly.

    **@ecopages/radiant**

    - Server SSR entries install scope adapters into core so client code never imports `@ecopages/jsx/server`.
    - SSR context provider stack lives on the JSX SSR render scope (symbol-keyed); import `@ecopages/radiant/server/install-ssr-runtime` (or another server SSR entry) before rendering hosts outside the browser.
    - SSR bundlers must resolve a single `@ecopages/*` instance (do not inline duplicate copies); the Vite Nitro playground externalizes these packages and installs the SSR runtime at server boot.

- [#60](https://github.com/ecopages/radiant/pull/60) [`017f705`](https://github.com/ecopages/radiant/commit/017f70500dbf86d0e8912e8840f8775a7eada9c4) Thanks [@andeeplus](https://github.com/andeeplus)! - Back reactive host members with signals `State` and wire jsx derived bindings through signals `computed`.

    **@ecopages/jsx**

    - Add `@ecopages/signals` as a peer dependency.
    - `mapSubscribable` now builds signal-backed derivations with `computed` when the source is a `SignalLike` (pull/push remains for `SubscribableJsxValue` adapters).

    **@ecopages/radiant**

    - Add `@ecopages/signals` as a direct dependency (no longer peer-only).
    - Removed `trackReactiveRead` and `registerReactiveDependencyReader` from `RadiantElement` and `RadiantController`. Host members are now signals-backed; dependency tracking is native via `State.get()`.
    - Legacy `@state` / `@prop` decorators now register member `State` during post-construction (SSR and connect), matching standard decorator timing.
    - Legacy `@prop` SSR staging honors pre-render property assignments while connect-time initialization still prefers explicit `defaultValue` over class field initializers.
    - Added `createReactiveMember`, `registerReactiveMember`, and `getReactiveMember` for advanced host integrations.
    - Removed exported `ReactiveField` metadata type; use `createReactiveField` / `@state` instead.

    Decorator APIs (`@state`, `@prop`, `@attr`, `@onUpdated`, `signal()`, `registerUpdateCallback`) are unchanged.

- Updated dependencies []:
    - @ecopages/signals@0.3.0-beta.4
