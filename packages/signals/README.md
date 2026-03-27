# Ecopages Signals

`@ecopages/signals` is an experimental reactive core package for the Ecopages monorepo.

It is intentionally smaller than the current TC39 Signals proposal and should be treated as a proving ground, not a frozen public design.

## Current Scope

This package currently provides:

- `State<T>` for writable values
- `Computed<T>` for lazily derived values
- `effect(...)` for reactive side effects with scheduled re-execution
- `watch(...)` for observing derived values with previous-value access
- `untrack(...)` and `peek(...)` for non-tracking reads
- `createStore(...)` for deep reactive object and array state
- `snapshot(...)` for materializing plain nested data
- automatic dependency discovery during `Computed` evaluation
- subscription support for renderer or framework adapters

## Design Position

This package is renderer-agnostic.

- It does not know about JSX.
- It does not know about Radiant components.
- It is meant to sit underneath adapters in those packages.

## Example

```ts
import { Computed, State, createStore, effect } from '@ecopages/signals';

const count = new State(0);
const parity = new Computed(() => ((count.get() & 1) === 0 ? 'even' : 'odd'));
const store = createStore({ profile: { name: 'Ada' } });

const dispose = effect(() => {
	console.log(parity.get(), store.profile.name);
});

const stopWatching = watch(
	() => store.profile.name,
	(nextName, previousName) => {
		console.log(previousName, '->', nextName);
	},
);

count.set(1);
store.profile.name = 'Grace';
dispose();
stopWatching();
```

## Limits

This implementation is still intentionally smaller than the current TC39 proposal.

- no TC39-style `Watcher` API surface
- no batching or transaction model
- no framework-owned disposal tree or component ownership integration yet

Those omissions are deliberate. The goal is to validate a useful cross-package core before freezing a broader public contract.
