---
'@ecopages/radiant': patch
---

Fix hosts re-subscribing to every render dependency on each render: a render computation is now watched before the previous one is unwatched, so a dependency read by both, such as an external store subscription, stays subscribed across renders.
