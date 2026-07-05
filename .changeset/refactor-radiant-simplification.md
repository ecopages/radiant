---
'@ecopages/radiant': patch
---

Refactored `@ecopages/radiant` internals for SSR, rendering, and legacy decorator readiness without public API changes.

- unified SSR host shape and moved element SSR service under `server/`
- extracted shared `RenderScheduler` for element and controller render paths
- centralized legacy host readiness and SSR registry/hydration wiring
- split the server light-DOM shim into `server/minimal-dom/*`
- fixed standard `@state` firing `@onUpdated` during construction (`suppressInitialNotify`)
