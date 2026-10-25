---
'@ecopages/jsx': patch
'@ecopages/radiant': patch
---

Reconnect a markerless page root when a nested custom-element host has already hydrated or rendered itself, even if it updated since, preserving the host node, its state and its named-slot content.
