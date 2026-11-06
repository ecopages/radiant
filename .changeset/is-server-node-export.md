---
'@ecopages/radiant': patch
---

`isServer` from `@ecopages/radiant/is-server` now reads `true` on Node, Deno, Bun and edge runtimes for installed packages. Before, the published package resolved to the browser build on every runtime, so `!isServer` guards never skipped on the server.
