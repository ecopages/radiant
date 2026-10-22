---
'@ecopages/radiant': patch
---

Document how decorated fields are typed, and fix the examples that wrote them as `declare`, which TypeScript rejects under standard decorators (`TS1206`). Each `@prop`, `@attr` and `@signal` example uses an initializer, `?` or `!` that matches what the runtime guarantees.

Legacy decorators (`experimentalDecorators: true`) never receive the field type, so none of the field checks run there, and the `map` parameter of `@bindTo` is `unknown` unless the whole field type, `undefined` included, is passed as a type argument: `@bindTo<number>(...)`. Leave `map` unannotated under standard decorators only.
