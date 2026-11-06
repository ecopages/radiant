---
'@ecopages/signals': patch
---

Fix: `watch()` no longer calls `notify` when the watched value is equal, under `equals` (default `Object.is`), to the last value it delivered. A set followed by a set-back in the same tick used to notify with the same value as both arguments. A real change still notifies once.
