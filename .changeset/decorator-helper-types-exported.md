---
'@ecopages/radiant': patch
---

Export the helper types that decorator results are made of. A library that exports a shared decorator needs them to compile with `declaration: true`; without them TypeScript reports `TS2883` or `TS4023`:

```ts
export const count = prop({ type: Number, defaultValue: 0 });
export const onClick = onEvent({ type: 'click' });
export const debounced = debounce(300);
export const watch = onUpdated('count');
```

From `@ecopages/radiant`: `ValueFieldDecorator`, `BoundedFieldDecorator`, `ReactivePropHost`, `QueryDecoratorHost`, `ReactiveAttributeHostLike`, `ReactiveHostLike` and `BindToHost` for field decorators, and `Method` and `UpdatedHost` for method decorators. From `@ecopages/radiant/context`: `ContextHostLike` and `ContextUpdateMethod`.
