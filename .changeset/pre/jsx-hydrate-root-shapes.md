---
'@ecopages/jsx': patch
---

Hydrate template and iterable roots in place, including when the root is a reactive wrapper around the current snapshot. Other shapes fall back to a client render instead of a marker-only scan that attached no live parts.
