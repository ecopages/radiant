---
'@ecopages/jsx': patch
'@ecopages/radiant': patch
---

Reconnect a markerless page root when a nested element that owns its content through its own client root, such as a custom-element host, has already hydrated or rendered itself, even if it updated since, preserving that element's node, its state and its named-slot content.
