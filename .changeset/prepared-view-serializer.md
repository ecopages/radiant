---
'@ecopages/radiant': minor
---

**Breaking:** Remove `RadiantElement.renderViewToString()`. Import the server function and pass the host explicitly:

```ts
// before
import '@ecopages/radiant/server/radiant-element-ssr';
const html = host.renderViewToString({ mode: 'hydrate' });

// after
import { renderRadiantElementViewToString } from '@ecopages/radiant/server/radiant-element-ssr';
const html = renderRadiantElementViewToString(host, { mode: 'hydrate' });
```

The view-only function now prepares the host, renders inside its context providers, and flushes `@bindTo` once, matching host serialization. It takes a `RadiantElement` host, as `renderRadiantElementHostToString` does.

Advanced exports from `@ecopages/radiant/server/radiant-element-ssr` changed too: the runtime from `getOrCreateRadiantElementSsrRuntime()` no longer has `renderView` or `getHostAttributes`; `RadiantElement.getSlotProjectionScriptTag()` is replaced by `getProjectedSlotPayload()`; `prepareForSsr()` no longer flushes `@bindTo`; the second argument of `createRadiantElementSsrService(host).renderHostToString(options, attributes)` is now overrides merged over the prepared attributes; and `getHostAttributes()` / `getRadiantElementHostSsrAttributes(host)` now prepare the host first.
