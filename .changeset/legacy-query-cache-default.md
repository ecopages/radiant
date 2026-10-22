---
'@ecopages/radiant': patch
---

Legacy `@query` (`experimentalDecorators: true`) no longer caches its result by default, matching standard decorators, `createQuery` and the docs: a field without `cache` re-runs the lookup on every read and returns the live node. Before, a legacy field kept returning the first element it found, even after a re-render replaced it.

If a legacy-mode component relied on that accidental caching, pass `cache: true` to keep it: `@query({ ref: 'status', cache: true }) status`.
