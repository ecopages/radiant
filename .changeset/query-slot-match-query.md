---
'@ecopages/radiant': minor
---

`@querySlot` and `createQuerySlot` now match `@query` and `createQuery`: the type argument is the element type, and `all` picks the value type.

**Breaking:** under standard decorators, a single-element `@querySlot` field must include `null`, because the query returns `null` while nothing is assigned to the slot. With `all: true` the field is an array, empty while nothing is assigned. A field that leaves `null` out, or an array field without `all: true`, no longer compiles:

```ts
// before: compiled, and `this.label.textContent` threw while the slot was empty
@querySlot({ name: 'label' }) label!: HTMLParagraphElement;
@querySlot() items!: HTMLElement[];
// after
@querySlot({ name: 'label' }) label!: HTMLParagraphElement | null;
@querySlot({ all: true }) items!: HTMLElement[];
```

`all` must be a literal `true` or `false`, or left out, because it picks the field type. `createQuerySlot`'s `.value` is `T[]` with `all: true` and `T | null` otherwise; with a `boolean` variable for `all`, it is `Element[] | Element | null` and `createQuerySlot` then takes no type argument. The type argument is now the element type, where it used to be the whole result:

```ts
// before
createQuerySlot<HTMLLIElement[]>(this, { all: true });
createQuerySlot<HTMLParagraphElement>(this, {}); // typed as the element, held null while empty
// after
createQuerySlot<HTMLLIElement>(this, { all: true });
createQuerySlot<HTMLParagraphElement>(this, {}); // value: HTMLParagraphElement | null
```

Runtime behaviour is unchanged.
