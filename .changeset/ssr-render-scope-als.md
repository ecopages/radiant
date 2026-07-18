---
'@ecopages/jsx': minor
'@ecopages/radiant': minor
---

Move SSR ambient render state to Node `AsyncLocalStorage` and keep client bundles free of the JSX server entry.

**@ecopages/jsx**

- `@ecopages/jsx/server` is Node-only and stores active SSR render scope in `AsyncLocalStorage` (no sync / browser fallback stack).
- Add `getActiveSsrScopeValue` / `withActiveSsrScopeValue` for framework-scoped SSR state.
- Add `createLazyNodeAsyncLocalStorage` / `createNodeAsyncLocalStorage` for Node SSR ambient helpers.
- `withForcedServerCustomElementRendering` is now a no-op legacy shim.

**@ecopages/radiant**

- Server SSR entries install scope adapters into core so client code never imports `@ecopages/jsx/server`.
- SSR context provider stack uses a separate module-local ALS; import a Radiant server SSR entry (or light-DOM shim) before rendering hosts outside the browser.
- SSR bundlers must resolve a single `@ecopages/*` instance (do not inline duplicate copies); the Vite Nitro playground externalizes these packages and installs the light-DOM shim at server boot.
