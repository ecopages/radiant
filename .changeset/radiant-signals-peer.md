---
'@ecopages/radiant': patch
---

@ecopages/radiant now declares @ecopages/signals as a peer dependency. It always imported it, but the published package did not list it, so a strict, isolated install failed to resolve it. Apps that use @ecopages/jsx already install @ecopages/signals.
