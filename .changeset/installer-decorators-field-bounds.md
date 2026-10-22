---
'@ecopages/radiant': minor
'@ecopages/radiant-ui': patch
---

**@ecopages/radiant**

`@query` and `@event` check the declared field against the value they install, under standard decorators, and the type argument of `@query` and `createQuery` is now the element type. The context decorators have their own note, and so do `@querySlot` and `createQuerySlot`, which follow `@query`.

**Breaking:** a single-element `@query` field must include `null`, because the query returns `null` when nothing matches. With `all: true` the field is an array. A field that leaves `null` out, or an array field without `all: true`, compiled before and no longer does:

```ts
// before: compiled, and `this.input.focus()` threw when the ref was missing
@query({ ref: 'input' }) input!: HTMLInputElement;
@query({ ref: 'item' }) items!: HTMLLIElement[];
// after
@query({ ref: 'input' }) input!: HTMLInputElement | null;
@query({ ref: 'item', all: true }) items!: HTMLLIElement[];
```

`all` has to be a literal `true` or `false`, or left out, because it picks the field type. `createQuery`'s `.value` is `T[]` with `all: true` and `T | null` otherwise. With a `boolean` variable for `all` it is `Element[] | Element | null`, and `createQuery` then takes no type argument. The type argument used to be the whole result:

```ts
// before
@query<HTMLElement[]>({ selector: '.item', all: true }) items!: HTMLElement[];
createQuery<HTMLElement[]>(this, { selector: '.item', all: true });
// after
@query<HTMLElement>({ selector: '.item', all: true }) items!: HTMLElement[];
createQuery<HTMLElement>(this, { selector: '.item', all: true });
```

**Breaking:** `@event` installs an `EventEmitter`, so its field has to be one, and cannot be optional:

```ts
// before: compiled
@event({ name: 'change' }) change!: string;
@event({ name: 'select' }) select?: EventEmitter<string>;
// after
@event({ name: 'change' }) change!: EventEmitter<string>;
@event({ name: 'select' }) select!: EventEmitter<string>;
```

Legacy decorators never see the field type and compile as before.

**@ecopages/radiant-ui**

Components declare their `@query` fields with `| null` and guard the places that used them. Behaviour with complete markup is unchanged.
