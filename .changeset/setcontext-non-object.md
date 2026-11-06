---
'@ecopages/radiant': patch
---

`setContext` now replaces an array, string, number, boolean or `null` context value instead of silently ignoring the call, notifying subscribers and running the callback. Plain objects keep the one-level merge.
