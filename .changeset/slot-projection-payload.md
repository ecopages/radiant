---
'@ecopages/radiant': patch
---

Host serialization emits a slot-projection payload for a render-owning host with Authored Children, even when its current server-time view does not contain a `<slot>`. A View-owned Shell has no render lifecycle, so its children stay in the markup without a payload.
