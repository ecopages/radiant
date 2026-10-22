---
'@ecopages/radiant': minor
---

Legacy `@query` (`experimentalDecorators: true`) no longer caches its result by default, matching standard decorators, `createQuery` and the docs: a field without `cache` runs the lookup on every read and returns the live node. A legacy field used to keep returning the first element it found, even after a re-render replaced it.

A legacy-mode component that relied on the cached node passes `cache: true`, which keeps the first element found and does not refresh it while the host stays connected:

```ts
// before: cached without asking
@query({ ref: 'status' }) status!: HTMLElement | null;
// after
@query({ ref: 'status', cache: true }) status!: HTMLElement | null;
```
