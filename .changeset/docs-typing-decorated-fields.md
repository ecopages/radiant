---
'@ecopages/radiant': patch
---

Document how decorated fields are typed. The README and the `@bindTo` TSDoc now say that legacy decorators (`experimentalDecorators: true`) never receive the field type, so none of the field checks run there and `@bindTo`'s `map` parameter is `unknown` unless the whole field type, `undefined` included, is passed as a type argument (`@bindTo<number>(...)`). The previous advice to leave the `map` parameter unannotated applies to standard decorators only.
