---
'@ecopages/radiant': minor
---

`@prop`, `@attr` and `@signal` take their value type from the declared field. Under standard decorators, the options that carry a value (`defaultValue`, `transform`, `converter`, `initial`, `source`) are checked against the field, as `@bindTo`'s `map` already was, so these need no explicit generic any more:

```ts
@attr({ defaultValue: 'a' }) mode!: 'a' | 'b';
@signal({ initial: 'a' }) mode!: WritableSignal<'a' | 'b'>;
@signal({ initial: [] }) items!: WritableSignal<string[]>;
```

The `type` constant is checked against the field as well, as the note on the `type` constant describes.

**Breaking:** a field whose type disagrees with a value-carrying option compiled before and held a value of another type at runtime. Make the field type match the value the decorator writes:

```ts
// before: compiled, but `count` holds a number
@prop({ type: Number, defaultValue: 0 }) count!: string;
// after
@prop({ type: Number, defaultValue: 0 }) count!: number;
```

**Breaking, legacy decorators (`experimentalDecorators`):** legacy decorators never receive the field type, so nothing is checked against the field, and the value type is no longer inferred from the options: it is `unknown` unless passed explicitly. A callback that uses the value needs the type:

```ts
// before: compiled, `v` was inferred as number from defaultValue
@prop({ type: Number, defaultValue: 0, transform: { toAttribute: (v) => v.toFixed() } }) count = 0;
// after
@prop<number>({ type: Number, defaultValue: 0, transform: { toAttribute: (v) => v.toFixed() } }) count = 0;
```

An explicit generic on `@prop` or `@attr` has to name the whole field type, `undefined` included. On `count?: number`, `@prop<number>(...)` compiled before and now fails; write `@prop<number | undefined>(...)`.

A failed `@attr` check names the option and field types, such as `Type 'number' is not assignable to type 'string'`. `@signal(options)` reports the option error plus `Unable to resolve signature of property decorator`. `@signal` no longer throws a `TypeError` when called with a target that does not match, which only a call that bypasses the types can do.
