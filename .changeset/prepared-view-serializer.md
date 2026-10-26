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

The view-only function now prepares the host, renders inside its context providers, and flushes `@bindTo` once, matching host serialization.
