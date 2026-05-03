---
'@ecopages/jsx': minor
'@ecopages/signals': minor
'@ecopages/radiant': minor
---

This release splits the platform into three focused packages while keeping them versioned together.

`@ecopages/jsx`

- adds the TSX authoring and rendering layer for the Radiant ecosystem
- provides DOM mounting, hydration, SSR rendering, and automatic JSX runtime entrypoints
- supports signal-like child bindings and explicit subscribable adapters for fine-grained updates

`@ecopages/signals`

- adds a standalone reactive primitives package that can be used with or without Radiant
- provides writable state, computed values, effects, watchers, stores, snapshots, and low-level subtle APIs
- keeps the signals runtime renderer-agnostic so it can back Radiant or be used directly in application code

`@ecopages/radiant`

- now builds on top of the new JSX and signals packages
- expands the custom-element and controller platform with SSR helpers, component helpers, and broader helper and context APIs
- replaces the legacy `@reactiveProp` and `@reactiveField` aliases with `@prop` and `@state`
