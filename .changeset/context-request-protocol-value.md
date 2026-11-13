---
'@ecopages/radiant': patch
---

Breaking: `context-request` callbacks now receive the context value instead of the provider, as the community context protocol specifies. If you dispatch `ContextRequestEvent` by hand, replace `provider.getContext()` with the value argument. Pass `true` as the third argument to receive updates and an `unsubscribe` function; call it when the element disconnects. A provider with no value yet answers with `undefined`, and a subscriber then receives the first value when it is set. The provider now calls `stopImmediatePropagation()` before the callback and also answers a plain `Event` with `context` and `callback` fields. `@contextSelector` and `@onContextUpdate` can now be answered by a provider from another protocol library when no Radiant provider answers. Decorators are otherwise unchanged; `@consumeContext` still receives the Radiant provider instance.
