# @ecopages/signals

## 0.10.0

### Minor Changes

- [#739](https://github.com/ecopages/radiant/pull/739) [`1052bcc`](https://github.com/ecopages/radiant/commit/1052bcc9312db7490ee264f5ca303a4c6912044a) Thanks [@andeeplus](https://github.com/andeeplus)! - Plain-object assignments to an existing store branch now preserve its identity and update only changed values. Arrays and non-plain values continue to be replaced.

### Patch Changes

- [#738](https://github.com/ecopages/radiant/pull/738) [`d787d54`](https://github.com/ecopages/radiant/commit/d787d54d9dd244280f6b2123cf57a1d2c54bacbd) Thanks [@andeeplus](https://github.com/andeeplus)! - Published type declarations now use explicit file extensions on relative imports, so TypeScript projects on `moduleResolution` `node16` or `nodenext` resolve the packages' types.

- [#726](https://github.com/ecopages/radiant/pull/726) [`c8239ff`](https://github.com/ecopages/radiant/commit/c8239ff1b73b5fa740b8cdf6479c3af6259a71ab) Thanks [@andeeplus](https://github.com/andeeplus)! - Update computed values and effects when a previously missing store key is added.

## 0.9.0

## 0.8.4

## 0.8.3

## 0.8.2

## 0.8.1

## 0.8.0

### Minor Changes

- [#632](https://github.com/ecopages/radiant/pull/632) [`6e98ef9`](https://github.com/ecopages/radiant/commit/6e98ef9ffd57ce38d5d92d15ddfb0bf6576ae49e) Thanks [@andeeplus](https://github.com/andeeplus)! - `mapItems(source, project)` maps each item of a list signal once, by identity, and reuses its result while the item stays in the list.

## 0.7.0

### Patch Changes

- [#587](https://github.com/ecopages/radiant/pull/587) [`28baef3`](https://github.com/ecopages/radiant/commit/28baef3940b6a6a5d4993d3909f787c2d3ef07f0) Thanks [@github-actions](https://github.com/apps/github-actions)! - Fix: `watch()` no longer calls `notify` when the watched value is equal, under `equals` (default `Object.is`), to the last value it delivered. A set followed by a set-back in the same tick used to notify with the same value as both arguments. A real change still notifies once.

## 0.6.0

## 0.5.1

## 0.5.0

## 0.4.0

## 0.3.0

First stable. Radiant hosts and JSX derivations use `State` and `computed` from this package. `@ecopages/radiant` depends on it directly; `@ecopages/jsx` takes it as a peer.
