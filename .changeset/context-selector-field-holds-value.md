---
'@ecopages/radiant': minor
---

`@contextSelector`, `@consumeContext` and `@provideContext` check the declared field under standard decorators: the field has to be able to hold the value the decorator writes. That is the provider of the decorator's own context for `@consumeContext` and `@provideContext`, and the context value, or what `select` returns, for `@contextSelector`.

**Breaking:** a field that cannot hold the written value compiled before and held a value outside its type at runtime. Declare the type the decorator writes:

```ts
const ctx = createContext<{ count: number }>('counter');

// before: compiled
@contextSelector({ context: ctx }) whole!: { count: 1 };
@consumeContext(ctx) provider!: ProviderSubclassWithMembers;
@consumeContext(ctxA) other!: ContextProvider<typeof ctxB>;
@provideContext({ context: ctxA }) provided!: ContextProvider<typeof ctxB>;
@provideContext({ context: ctx }) maybe?: ContextProvider<typeof ctx>;
// after
@contextSelector({ context: ctx }) whole!: { count: number };
@consumeContext(ctx) provider!: ContextProvider<typeof ctx>;
@consumeContext(ctxA) other!: ContextProvider<typeof ctxA>;
@provideContext({ context: ctxA }) provided!: ContextProvider<typeof ctxA>;
@provideContext({ context: ctx }) always!: ContextProvider<typeof ctx>;
```

`@provideContext` always installs a provider, so its field cannot be optional. `@consumeContext` can be: `provider?: ContextProvider<typeof ctx>` holds `undefined` until a provider connects.

With `select`, `@contextSelector` also accepts an optional field, which holds `undefined` until the first delivery, and a field wider than the selection, such as `number | string`. Both used to fail:

```ts
@contextSelector({ context: ctx, select: (c) => c.count }) count?: number;
```

`@contextSelector` on a field no longer throws a `TypeError` for a target that does not match its context, a call that bypasses the types; the method form still checks its target. Legacy decorators never see the field type and compile as before.
