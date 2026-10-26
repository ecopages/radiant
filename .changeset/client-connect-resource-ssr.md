---
'@ecopages/radiant': patch
---

`createResource(...)` starts on the client connect pass, after authored attributes sync and the initial render or hydration, just before `onConnected()`, so the first fetch uses authored prop values instead of the defaults.
