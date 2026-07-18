---
'@ecopages/jsx': minor
'@ecopages/radiant': minor
---

Move SSR ambient render state to Node `AsyncLocalStorage` and keep client bundles free of the JSX server entry.

**@ecopages/jsx**

- `@ecopages/jsx/server` is Node-only and stores active SSR render scope in `AsyncLocalStorage` (no sync / browser fallback stack).
- Add `getActiveSsrScopeValue` / `withActiveSsrScopeValue` for framework-scoped SSR state on the active render scope.
- `withForcedServerCustomElementRendering` is now a no-op legacy shim.

**@ecopages/radiant**

- Server SSR entries install scope adapters into core so client code never imports `@ecopages/jsx/server`.
- SSR context provider stack lives on the JSX SSR render scope (symbol-keyed); import `@ecopages/radiant/server/install-ssr-runtime` (or another server SSR entry) before rendering hosts outside the browser.
- SSR bundlers must resolve a single `@ecopages/*` instance (do not inline duplicate copies); the Vite Nitro playground externalizes these packages and installs the SSR runtime at server boot.
