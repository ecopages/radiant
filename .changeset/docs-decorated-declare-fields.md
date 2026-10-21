---
'@ecopages/radiant': patch
---

Docs examples no longer write decorated fields as `declare`, which TypeScript rejects under standard decorators (`TS1206`). Each `@prop`, `@attr` and `@signal` example now uses an initializer, `?` or `!` that matches what the runtime guarantees, and the `initial` option of `@signal` documents the `status!: WritableSignal<string>` form. The shared-signal example types the field as `WritableSignal<number>`, which is what the decorator returns.
