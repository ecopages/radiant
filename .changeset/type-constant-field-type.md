---
'@ecopages/radiant': minor
---

The `type` constant on `@prop` and `@attr` now constrains the field and `defaultValue` under standard decorators, and supersedes "The `type` constant is not checked" in the note on value decorators. `String` needs a `string` field, `Number` a `number`, `Boolean` a `boolean`, `Array` an array (readonly or not) and `Object` an object that is not an array, `null` and `undefined` allowed. The runtime already parses the attribute with `type` and throws at class evaluation when `defaultValue` does not match it; the types now say so first.

Fields whose type disagrees with `type`, which compiled before and held a value of another type at runtime, now fail to compile:

```ts
// before: compiled, but `size` holds a number
@prop({ type: Number }) size?: string;
// after
@prop({ type: Number }) size?: number;
```

A field whose type is a union of several parsed types, such as `string | number`, fits no single constant and now fails to compile, even though `type: Number` fills it with numbers that fit it. Narrow the field to what `type` parses, or pass `transform.fromAttribute` (`@prop`) or `converter.fromAttribute` (`@attr`): a parser owns the value type, and `type` is not checked then.

```ts
// before: compiled
@prop({ type: Number }) size: string | number;
// after
@prop({ type: Number }) size: number;
@prop({ type: String, transform: { fromAttribute: (v) => (v === null ? 0 : v) } }) size: string | number;
```

The parser must be part of the option's type. A transform declared as `const csv: PropTransform<string[]> = { fromAttribute }` has `fromAttribute` optional in its type, so `type` is checked against the field; declare it with `satisfies PropTransform<string[]>` instead. Under legacy decorators, a transform whose callbacks take the value type still needs the explicit generic, as in `@prop<string[]>(...)`. With a parser, the runtime still checks `defaultValue` against `type`.

A field typed by a type parameter of a generic host, such as `value: V` on `class Select<V extends string>`, now fails to compile with a `type` constant, because the field type cannot be resolved there. On `@attr`, omit `type: String`, which reads the attribute the same way. On `@prop`, pass a parser that keeps the raw value:

```ts
// before: compiled
@prop({ type: String }) value: V;
// after
@prop({ type: String, transform: { fromAttribute: (v) => v as V } }) value: V;
```

An explicit generic is checked against `type` in both decorator modes: `@prop<string>({ type: Number })` no longer compiles. Under legacy decorators without an explicit generic, `type` is still not checked.

Every failed `@prop` or `@attr` check, the existing `defaultValue`, `transform` and `converter` checks included, now reports `No overload matches this call` followed by the error from the overload without a parser. A `type` mismatch names the two constructors, such as `Type 'NumberConstructor' is missing the following properties from type 'StringConstructor'`; on a union field the expected type is `never`.
