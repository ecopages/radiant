---
'@ecopages/radiant': patch
---

Export `withConfig` from `@ecopages/radiant/helpers/agent-tool-config`. It copies an agent tool config with some fields overridden, such as `getEnabled`, and reads no getter while it copies, which spreading the config does not do: a `parse` getter, such as one that loads a schema library, runs only when the tool registers, and never in a browser without `document.modelContext`.
