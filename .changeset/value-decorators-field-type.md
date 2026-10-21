---
'@ecopages/radiant': minor
---

`@prop`, `@attr` and `@signal` now take their value type from the declared field. Under standard decorators, the options that carry a value (`defaultValue`, `transform`, `converter`, `initial`, `source`) are checked against it, as `@bindTo`'s `map` already was. The `type` constant is checked as well, as the note on it describes.

Fields that need no explicit generic any more, which failed to compile before:

```ts
@attr({ defaultValue: 'a' }) mode: 'a' | 'b';
@signal({ initial: 'a' }) mode!: WritableSignal<'a' | 'b'>;
@signal({ initial: [] }) items!: WritableSignal<string[]>;
```

Fields whose type disagrees with a value-carrying option, which compiled before and held a value of another type at runtime, now fail to compile. Make the field type match the value the decorator writes:

```ts
// before: compiled, but `count` holds a number
@prop({ type: Number, defaultValue: 0 }) count: string;
// after
@prop({ type: Number, defaultValue: 0 }) count: number;
```

Under legacy decorators (`experimentalDecorators`), nothing is checked against the field, and the value type is no longer inferred from the options either: it is `unknown` unless passed explicitly. A callback that uses the value now needs the type:

```ts
// before: compiled, `v` was inferred as number from defaultValue
@prop({ type: Number, defaultValue: 0, transform: { toAttribute: (v) => v.toFixed() } }) count = 0;
// after
@prop<number>({ type: Number, defaultValue: 0, transform: { toAttribute: (v) => v.toFixed() } }) count = 0;
```

On `@attr`, a failed check now names the option and field types, such as `Type 'number' is not assignable to type 'string'`, instead of `Argument of type 'undefined' is not assignable to parameter of type ...` naming the host; `@prop` reported nothing before. `@signal(options)` reports the option error plus a second "Unable to resolve signature of property decorator" error. Explicit generics such as `@signal<Mode>({ initial: 'a' })` still work when they name the whole field type, `undefined` included: on `count?: number`, `@prop<number>(...)` compiled before and now fails; write `@prop<number | undefined>(...)`.

`@signal` no longer throws a `TypeError` when called with a target that does not match its context, which a decorator call never does. Runtime behaviour is otherwise unchanged.
