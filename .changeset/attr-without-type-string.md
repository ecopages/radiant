---
'@ecopages/radiant': minor
---

An `@attr` with neither `type` nor `converter.fromAttribute` returns the attribute as a string, so under standard decorators it now needs a `string | null | undefined` field, a string literal union included. A `number` or `boolean` field used to compile and held a string once the attribute was set (`"5" + 1` is `"51"`).

**Breaking:** add the `type` that parses the attribute, keep the field a string, or pass a parser that owns the value type:

```ts
// before: compiled, but `count` holds the string "5"
@attr({ source: 'data-count' }) count!: number;
@attr({ defaultValue: 0 }) total!: number;
@attr() enabled?: boolean;
// after
@attr({ source: 'data-count', type: Number }) count!: number;
@attr({ type: Number, defaultValue: 0 }) total!: number;
@attr({ type: Boolean }) enabled?: boolean;
@attr({ converter: { fromAttribute: (v) => Number(v) } }) count!: number;
```

`@attr() title = ''` and a field typed by a type parameter of a generic host still compile as they did.

The error for a `number` field without `type` reads `Type 'number' is not assignable to type 'string'` under `Unable to resolve signature of property decorator`, or `Property 'type' is missing` when an option such as `defaultValue` is given.

An explicit generic is checked in both decorator modes: write `@attr<number>({ type: Number, defaultValue: 0 })`, because `@attr<number>({ defaultValue: 0 })` no longer compiles. An options object annotated as `AttrOptions<number, NumberConstructor>` has `type` optional in its type, so it is checked as an `@attr` without `type` and fails too; declare it with `satisfies AttrOptions<number, NumberConstructor>` or pass it inline.

Under legacy decorators (`experimentalDecorators`) the field is never seen, so only an option that is not a string without `type` is rejected, such as `@attr({ defaultValue: 0 })`. `converter.toAttribute` receives `string | null | undefined` there without `type` or `converter.fromAttribute`, and `unknown` with either; pass the field type, as in `@attr<number>(...)`, when it needs the value.
