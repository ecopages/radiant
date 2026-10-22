---
'@ecopages/radiant': minor
---

The `type` constant on `@prop` and `@attr` has to fit the field under standard decorators: `String` needs a `string` field, `Number` a `number`, `Boolean` a `boolean`, `Array` an array (readonly or not) and `Object` an object that is not an array, with `null` and `undefined` allowed. The runtime already parses the attribute with `type`, so a field of another type held a value outside its type.

**Breaking:** a field whose type disagrees with `type` compiled before and now fails. An array field needs `Array`, because an `Object` attribute rejects arrays at runtime:

```ts
// before: compiled, but `size` holds a number
@prop({ type: Number }) size?: string;
@prop({ type: Object }) tags!: string[];
// after
@prop({ type: Number }) size?: number;
@prop({ type: Array }) tags!: string[];
```

**Breaking:** a field typed as a union of several parsed types, such as `number | 'auto'`, fits no single constant. Narrow the field to what `type` parses, or pass `transform.fromAttribute` (`@prop`) or `converter.fromAttribute` (`@attr`). A parser owns the value type, and `type` is not checked then:

```ts
// before: compiled
@prop({ type: Number }) size!: number | 'auto';
// after
@prop({ type: Number, transform: { fromAttribute: (v) => (v === 'auto' ? v : Number(v)) } }) size!: number | 'auto';
```

The parser has to be part of the option's type, so pass it inline or declare it with `satisfies`. A transform annotated as `const csv: PropTransform<string[]> = { fromAttribute }` has `fromAttribute` optional in its type, so `type` is still checked against the field:

```ts
// before: compiled
const csv: PropTransform<string[]> = { fromAttribute: (v) => (v ? v.split(',') : []) };
@prop({ type: String, transform: csv }) tags!: string[];
// after
const csv = { fromAttribute: (v: string | null) => (v ? v.split(',') : []) } satisfies PropTransform<string[]>;
@prop({ type: String, transform: csv }) tags!: string[];
```

**Breaking:** a field typed by a type parameter of the host class, such as `value: V` on `class Select<V extends string>`, fits no constant because TypeScript cannot resolve its type there. On `@attr`, drop `type: String`, which reads the attribute the same way. On `@prop`, pass a parser that keeps the raw value:

```ts
// before: compiled
@prop({ type: String }) value!: V;
@attr({ type: String }) label!: V;
// after
@prop({ type: String, transform: { fromAttribute: (v) => v as V } }) value!: V;
@attr() label!: V;
```

An explicit generic is checked against `type` in both decorator modes: `@prop<string>({ type: Number })` no longer compiles. Under legacy decorators without an explicit generic, `type` is not checked.

A failed check reports `No overload matches this call`. A `type` mismatch names the two constructors, such as `Type 'NumberConstructor' is missing the following properties from type 'StringConstructor'`; on a union field the expected type is `never`.
