---
'@ecopages/radiant': patch
---

Fix `@bindTo` and `registerUpdateCallback` subscriptions outliving a disconnected host. They are now released on disconnect, so a removed host no longer stays subscribed to a shared `@signal` or writes to detached DOM, and are re-established on reconnect, which paints the targets with the current value.
