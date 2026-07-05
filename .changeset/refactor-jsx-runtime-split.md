---
'@ecopages/jsx': minor
---

Refactored `@ecopages/jsx` by splitting the runtime monolith into focused modules and unifying serialization paths.

- extracted DOM render reconciliation, template compilation, and binding helpers
- centralized renderable guards, attribute normalization, and plain-object serialization
- aligned server and client serialization around shared renderable handling
