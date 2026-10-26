---
'@ecopages/radiant': patch
---

A View-owned Shell (a host without a `render()` override) no longer ships its children a second time as a slot-projection payload. Render-owning hosts with Authored Children keep the payload whether or not their server-time view contains a `<slot>`.
