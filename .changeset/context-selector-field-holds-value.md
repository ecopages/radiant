---
'@ecopages/radiant': minor
---

`@contextSelector`, `@consumeContext` and `@provideContext` now reject a field that cannot hold the value they write, under standard decorators. The field was only checked to be a subtype of that value, so a narrower field compiled and held a value outside its type at runtime.

Fields that compiled before and now fail:

```ts
const ctx = createContext<{ count: number }>('counter');

// before: compiled, and `narrowed` holds 7 once the provider sends it
@contextSelector({ context: ctx, select: (c) => c.count }) narrowed?: 1;
@contextSelector({ context: ctx }) whole!: { count: 1 };
@consumeContext(ctx) provider!: SubclassOfContextProvider;
// after: declare the type the decorator writes
@contextSelector({ context: ctx, select: (c) => c.count }) count?: number;
@contextSelector({ context: ctx }) whole!: { count: number };
@consumeContext(ctx) provider!: ContextProvider<typeof ctx>;
```

Without `select`, `@contextSelector` no longer takes the selected type from the field, so any field type compiled there; the field now has to hold the context's value. A field wider than the selection, such as `number | string` or `unknown`, now compiles on `@contextSelector`. The error for a narrower field names both types, for example `Type 'number' is not assignable to type '1'`. Legacy decorators never see the field type and compile as before.
