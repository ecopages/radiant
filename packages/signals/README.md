# Ecopages Signals

`@ecopages/signals` is a renderer-agnostic signals package that can be used standalone or underneath Radiant.

Its core model is based on the [TC39 Signals proposal](https://github.com/tc39/proposal-signals/tree/main), with a smaller surface area and a few convenience helpers for application code today.

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
- It is meant to work both as a standalone package and underneath adapters in those packages.

## TC39 Relationship

This package is based on the current TC39 Signals proposal and tracks the same broad model around:

- `State` and `Computed` signal classes
- lazy pull-based recomputation with cached values
- automatic dependency discovery during computed evaluation
- custom equality functions for writable and computed signals
- untracked reads as an escape hatch

It is not a drop-in implementation of the current proposal draft.

- It exposes convenience helpers such as `effect(...)`, `watch(...)`, `createStore(...)`, and `snapshot(...)` directly.
- It currently exposes manual `subscribe(...)` hooks for adapter and library integration.
- It exposes a proposal-shaped `subtle.Watcher` API, while still keeping the existing convenience helpers.
- Its `subtle.Watcher` follows the proposal-style re-arm behavior, where calling `watch(...)` resets the pending set and notification latch for the next invalidation cycle.
- It does not yet expose the full TC39 subtle introspection surface.

## Example

```ts
import { Computed, State, createStore, effect, watch } from '@ecopages/signals';

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

This implementation is still smaller than the current TC39 proposal draft.

- no full TC39 `Watcher` and subtle semantics surface yet
- no full proposal-style subtle introspection helpers yet
- no batching or transaction model
- no framework-owned disposal tree or component ownership integration yet

Those omissions are deliberate. The goal is to keep a small, useful standalone package while leaving room to align further as the proposal evolves.
