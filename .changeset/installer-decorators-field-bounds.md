---
'@ecopages/radiant': minor
'@ecopages/radiant-ui': patch
---

`@query`, `@querySlot`, `@event`, `@consumeContext`, `@provideContext` and the field form of `@contextSelector` now check the declared field against the value they install, under standard decorators.

**Breaking:** a single-element `@query` field must include `null`, because the query returns `null` when nothing matches. With `all: true` the field is an array. A field that leaves `null` out, or an array field without `all: true`, no longer compiles:

```ts
// before: compiled, and `this.input.focus()` threw when the ref was missing
@query({ ref: 'input' }) input!: HTMLInputElement;
// after
@query({ ref: 'input' }) input!: HTMLInputElement | null;
@query({ ref: 'item', all: true }) items!: HTMLLIElement[];
```

On `@query`, `all` must be a literal `true` or `false`, or left out, because it picks the field type. The type argument of `@query` and `createQuery` is now the element type. `createQuery`'s `.value` is `T[]` with `all: true` and `T | null` otherwise; with a `boolean` variable for `all`, it is `Element[] | Element | null`, and `createQuery` then takes no type argument:

```ts
// before
@query<HTMLElement[]>({ selector: '.item', all: true }) items!: HTMLElement[];
createQuery<HTMLElement[]>(this, { selector: '.item', all: true });
// after
@query<HTMLElement>({ selector: '.item', all: true }) items!: HTMLElement[];
createQuery<HTMLElement>(this, { selector: '.item', all: true });
```

These fields compiled before and now fail, because the decorator installs a different value:

```ts
@event({ name: 'change' }) change: string;
@consumeContext(ctxA) ctx!: ContextProvider<typeof ctxB>;
@provideContext({ context: ctxA }) provider!: ContextProvider<typeof ctxB>;
```

`@event` and `@provideContext` always install a value, so their bounds leave `undefined` out and the field can no longer be optional. Write `change!: EventEmitter<string>` where `change?: EventEmitter<string>` compiled before.

`@querySlot` now requires a `RadiantElement` host instead of accepting any class. `@contextSelector` now accepts an optional field, which holds `undefined` until the first delivery: `@contextSelector({ context, select: (c) => c.count }) count?: number;`. `@contextSelector` fields no longer throw a `TypeError` on a target that does not match their context, such as a legacy static field; the types already reject such a field. The method form still checks its target.

Radiant UI components declare their `@query` fields with `| null` and handle a missing element. Runtime behaviour is otherwise unchanged.
