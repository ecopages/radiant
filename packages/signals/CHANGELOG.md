# @ecopages/signals

## 0.7.0

### Patch Changes

- [#537](https://github.com/ecopages/radiant/pull/537) [`59413fa`](https://github.com/ecopages/radiant/commit/59413fa6b2c6a08cb92adfd2fd444c3ba3ea146d) Thanks [@andeeplus](https://github.com/andeeplus)! - Fix: `watch()` no longer calls `notify` when the watched value is equal, under `equals` (default `Object.is`), to the last value it delivered. A set followed by a set-back in the same tick used to notify with the same value as both arguments. A real change still notifies once.

## 0.6.0

## 0.5.1

## 0.5.0

## 0.4.0

## 0.3.0

First stable. Radiant hosts and JSX derivations use `State` and `computed` from this package. `@ecopages/radiant` depends on it directly; `@ecopages/jsx` takes it as a peer.
