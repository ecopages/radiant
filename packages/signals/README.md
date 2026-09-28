# Ecopages Signals

`@ecopages/signals` is a renderer-agnostic signals package that can be used standalone or underneath Radiant.

Its core model is based on the [TC39 Signals proposal](https://github.com/tc39/proposal-signals/tree/main), with a smaller surface area and a few convenience helpers for application code today.

The public entrypoint remains `index.ts`, while the implementation now lives in focused modules under `src/` so the core runtime, effects, watcher support, and store logic can evolve independently.

## Current Scope

This package currently provides:

- `State<T>` for writable values
- `Computed<T>` for lazily derived values
- `currentComputed()` for advanced derived helpers that need the active computed context
- `effect(...)` for reactive side effects with scheduled re-execution
- `watch(...)` for observing derived values with previous-value access
- `untrack(...)` and `peek(...)` for non-tracking reads
- `subtle.Watcher` plus `watched` and `unwatched` hooks for low-level invalidation workflows
- `createStore(...)` for deep reactive object and array state
- `isStore(...)` for detecting signal-backed store proxies
- `snapshot(...)` for materializing plain nested data
- automatic dependency discovery during `Computed` evaluation
- subscription support for renderer or framework adapters

## Source Layout

The package is organized around a stable public barrel and smaller implementation files:

- `index.ts` re-exports the public API and exposes `subtle`
- `src/types.ts` defines the public contracts, options, and low-level symbols
- `src/state.ts` implements writable `State` signals
- `src/computed.ts` implements lazy derived `Computed` signals and active-computation helpers
- `src/effect.ts` and `src/watch.ts` implement effect scheduling and derived-value observation
- `src/watcher.ts` implements proposal-shaped low-level watchers
- `src/tracking.ts` contains non-tracking read helpers
- `src/store.ts` contains deep store proxying and snapshot materialization

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

It is best understood as proposal-aligned in its core semantics, but not yet fully API-compatible with the draft surface.

- It exposes convenience helpers such as `effect(...)`, `watch(...)`, `createStore(...)`, and `snapshot(...)` directly.
- It currently exposes manual `subscribe(...)` hooks for adapter and library integration.
- It exposes a proposal-shaped `subtle.Watcher` API, while still keeping the existing convenience helpers.
- Its `subtle.Watcher` follows the proposal-style re-arm behavior, where calling `watch(...)` resets the pending set and notification latch for the next invalidation cycle.
- It does not yet expose the full TC39 subtle introspection surface.

## API Notes

- `subscribe(...)` is intended for adapter-style push integration. Application-level derived work is usually better expressed with `Computed`, `effect(...)`, or `watch(...)`.
- `watch(...)` is built on top of a computed signal plus an effect, so it inherits computed equality behavior and effect scheduling.
- `subtle.Watcher` reports staleness rather than recalculated values. Calling `watch(...)` is both registration and reset.
- `createStore(...)` wraps nested plain objects and arrays, while `snapshot(...)` detaches the current plain value graph for logging, serialization, or comparison.

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
