---
'@ecopages/radiant': minor
---

`@querySlot` and `createQuerySlot` match `@query` and `createQuery`: the type argument is the element type, and `all` picks the value type.

**Breaking:** under standard decorators, a single-element `@querySlot` field must include `null`, because the query returns `null` while nothing is assigned to the slot. With `all: true` the field is an array, empty while nothing is assigned. A field that leaves `null` out, or an array field without `all: true`, compiled before and no longer does:

```ts
// before: compiled, and `this.label.textContent` threw while the slot was empty
@querySlot({ name: 'label' }) label!: HTMLParagraphElement;
@querySlot() items!: HTMLElement[];
// after
@querySlot({ name: 'label' }) label!: HTMLParagraphElement | null;
@querySlot({ all: true }) items!: HTMLElement[];
```

`all` has to be a literal `true` or `false`, or left out. `createQuerySlot`'s `.value` is `T[]` with `all: true` and `T | null` otherwise. With a `boolean` variable for `all` it is `Element[] | Element | null`, and `createQuerySlot` then takes no type argument. The type argument used to be the whole result, and the value was typed `| null` even with `all: true`:

```ts
// before: value is HTMLLIElement[] | null
createQuerySlot<HTMLLIElement[]>(this, { all: true });
// after: value is HTMLLIElement[]
createQuerySlot<HTMLLIElement>(this, { all: true });
```

Under standard decorators, `@querySlot` also requires a `RadiantElement` host instead of accepting any class. Runtime behaviour is unchanged.
