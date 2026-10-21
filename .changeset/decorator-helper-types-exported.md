---
'@ecopages/radiant': patch
---

Export the helper types that decorator results are made of, so a library that exports a shared field decorator, such as `export const count = prop({ type: Number, defaultValue: 0 });`, compiles with `declaration: true` instead of failing with TS2883. From `@ecopages/radiant`: `ValueFieldDecorator`, `BoundedFieldDecorator`, `ReactivePropHost`, `QueryDecoratorHost`, `ReactiveAttributeHostLike`, `ReactiveHostLike` and `BindToHost`. From `@ecopages/radiant/context`: `ContextHostLike` and `ContextUpdateMethod`.

`@prop({ type: Object })` is now rejected on a field typed as a union with an array member, such as `Record<string, unknown> | string[]`, as it already was on an array field. `@contextSelector` on a field of the wrong type reports the mismatch between the field and the selected type, instead of `undefined` not matching a method.
