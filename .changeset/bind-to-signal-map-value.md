---
'@ecopages/radiant': minor
---

Under standard decorators, `@bindTo` on a `@signal` field types `map` with the signal's value, the value it already received at runtime. Before, the types gave `map` the `WritableSignal<number>`, so `(v) => v.toFixed()` did not compile and `(v) => v.get().toFixed()` compiled but threw on the first paint.

**Breaking:** a `map` whose parameter is annotated with the signal type no longer compiles. Drop the annotation, or annotate it with the value:

```ts
// before: compiled, threw at runtime ("v.get is not a function")
@bindTo({ attr: 'data-n', map: (v: WritableSignal<number>) => v.get().toFixed() }) @signal({ initial: 0 }) n!: WritableSignal<number>;
// after
@bindTo({ attr: 'data-n', map: (v) => v.toFixed() }) @signal({ initial: 0 }) n!: WritableSignal<number>;
```

A parameter annotated `unknown`, the old workaround, still compiles. A field whose type is not a signal is typed as before, except that a callback parameter annotated with a generic host's own type parameter (`map: (v: V) => v` on `h!: V`) no longer compiles: leave it unannotated. Under legacy decorators (`experimentalDecorators`) the field is never seen: pass the whole field type as the type argument, `@bindTo<WritableSignal<number>>(...)`.
