---
'@ecopages/radiant': patch
---

Fix `@bindTo` and `registerUpdateCallback` subscriptions outliving a disconnected host. They are now released on disconnect, so a removed host no longer stays subscribed to a shared `@signal` or writes to detached DOM, and are re-established on reconnect, which paints the targets with the current value. A member value written before the host connects no longer runs update callbacks at write time; they run on connect when the value changed. A member replaced while its host is detached is now reported on reconnect when its value differs from its value at disconnect, and a callback that disconnects its host during connect no longer leaves subscriptions behind.
