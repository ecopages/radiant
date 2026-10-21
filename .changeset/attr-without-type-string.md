---
'@ecopages/radiant': minor
---

An `@attr` with neither `type` nor `converter.fromAttribute` now needs a `string | null | undefined` field, a string literal union included. Without a parser the runtime returns the attribute as a string, so a `number` or `boolean` field held a string once the attribute was set (`"5" + 1` is `"51"`). The types used to accept it; they no longer do, under standard decorators. This supersedes the earlier notes that an `@attr` without `type` is unchecked.

Fields that compiled before and held a string at runtime now fail to compile. Add the `type` that parses the attribute:

```ts
// before: compiled, but `count` holds the string "5"
@attr({ source: 'data-count' }) count: number;
@attr({ defaultValue: 0 }) count: number;
@attr() enabled?: boolean;
// after
@attr({ source: 'data-count', type: Number }) count: number;
@attr({ type: Number, defaultValue: 0 }) count: number;
@attr({ type: Boolean }) enabled?: boolean;
```

Or keep the field a string, or pass a parser that owns the value type: `@attr({ converter: { fromAttribute: (v) => Number(v) } }) count: number`. `@attr() title = ''`, `@attr({ defaultValue: 'a' }) mode: 'a' | 'b'` and a field typed by a type parameter of a generic host still compile as they did.

The error for a non-string field without `type` reads `Type 'number' is not assignable to type 'string'` under `Unable to resolve signature of property decorator`, or `Property 'type' is missing` when an option such as `defaultValue` is given. Legacy decorators never see the field, so they reject only an option that is not a string without `type`, such as `@attr({ defaultValue: 0 })`, and `converter.toAttribute` without `type` now receives `string | null | undefined` instead of `unknown`. An explicit generic is checked in both decorator modes: `@attr<number>({ defaultValue: 0 })` no longer compiles, write `@attr<number>({ type: Number, defaultValue: 0 })`. An options object annotated as `AttrOptions<number, NumberConstructor>` has `type` optional in its type, so it is checked as an `@attr` without `type` and fails too; declare it with `satisfies AttrOptions<number, NumberConstructor>` or pass it inline.
