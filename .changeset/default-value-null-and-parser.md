---
'@ecopages/radiant': patch
---

`@prop` and `@attr` accept `defaultValue: null`, and skip the check of `defaultValue` against `type` when a parser is given, `transform.fromAttribute` on `@prop` or `converter.fromAttribute` on `@attr`, because the parser owns the value type. Both used to throw, `@prop` when the class loaded and `@attr` when the attribute was installed. A default that does not fit `type` without a parser still throws.

```ts
@prop({ type: Number, defaultValue: null }) count!: number | null;
```

An absent attribute reads `null` on an `@attr` with `type` and `defaultValue: null`.
