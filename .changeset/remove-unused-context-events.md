---
'@ecopages/radiant': patch
---

Removed the unused `context-on-mount` and `context-mounted` events, along with `ContextEventsTypes.ON_MOUNT`, `ContextEventsTypes.MOUNTED` and the `ContextOnMountEvent` class exported from `@ecopages/radiant/context`. Nothing in Radiant listened for them. To run code once a consumer receives its provider, override `connectedContextCallback(context)` on the consumer, or use `@onContextUpdate` to react to the value.
