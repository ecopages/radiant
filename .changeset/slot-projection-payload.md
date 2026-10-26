---
'@ecopages/radiant': patch
---

Host serialization emits a slot-projection payload only for a render-owning host whose view contains a `<slot>`. A View-owned Shell, and a host whose view has no slot, no longer ship their children a second time as JSON.
