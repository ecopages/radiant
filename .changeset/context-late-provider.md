---
'@ecopages/radiant': patch
---

A context consumer that connects before its provider's element is defined now receives the value once the provider upgrades, and keeps receiving updates. The provider announces itself with a bubbling `context-provider` event, as the community context protocol's late-provider pattern describes, and consumers below it that found no provider ask again, for plain and subscribing requests. A consumer that disconnected is not called. Apps no longer need to import the provider before its consumers.
