# Decorators

## Contents

- Host definition
- Reactive data
- Side effects
- DOM queries
- Events
- Callback utilities

## Host definition

- `@customElement(...)` — register the custom-element class; once per host class
- `@controller(...)` — register a controller identifier for `data-controller="..."` attachment; once per controller class

## Reactive data

- `@prop(...)` — public custom-element API: attribute conversion, reflection, optional bindings
- `@state` — internal mutable UI state
- `@signal` or `@signal(options)` — signal-backed host state / signal interop

`@signal` options:

- `bind` — JSX binding companion (`true`, or a custom name string)
- `initial` — default when the field initializer is omitted
- `source` — existing shared `WritableSignal` or `(host) => WritableSignal`
- `hydrate` — attribute type constant for SSR hydration via keyed JSON script

Bare `@signal` (no parentheses) creates a host-owned signal with defaults.

## Side effects

`@onUpdated(...)` — side effects or derived state when a reactive member changes.

Use for DOM sync outside JSX binding positions, derived state, storage, analytics, or external effects.

Avoid updating the same watched property inside its own `@onUpdated(...)` unless the logic is guaranteed to settle.

## DOM queries

- `@query(...)` — rendered descendants by `data-ref` or selector
- `@querySlot(...)` — projected slot-assigned elements from a `RadiantElement`

`@query` options: `ref` or `selector`; `all` for `Element[]`; `cache` (default `false`); `scope` `'light'` (default) | `'shadow'` | `'both'`. Prefer `ref` over broad selectors.

Use `@query` only for DOM the host does **not** own in its own `render()` — slot-projected or consumer-authored content, controller-attached DOM, or a live `Element` handle for a third-party imperative API.

If a `@query` exists only so `@onUpdated` can write into it (`.textContent`, `.setAttribute`, boolean/property writes), use a JSX binding (`this.$.foo`) instead. Querying a node `render()` just produced in order to write into it is redundant and defeats fine-grained patching.

## Events

- `@onEvent(...)` — declarative event subscription (lifecycle-owned)
- `@event(...)` — typed custom-event emitter for host-to-parent communication

`@onEvent` target — exactly one of `{ ref }`, `{ selector }`, `{ window: true }`, `{ document: true }`. `scope` is `'light'` | `'shadow'` | `'both'` (default `'light'`).

Delegation requires bubbling. `focus` / `blur` will not work — use `focusin` / `focusout`. Prefer `ref` for internal wiring; `selector` only when delegation is intentional; `window` / `document` only for truly global sources.

## Callback utilities

- `@bound` — bind a prototype method to the instance on access (timers, manual listeners, callback-style APIs)
- `@debounce(ms)` — delay bursty execution (search, resize, autosave)

Arrow-function fields are fine when instance-local allocation is acceptable. `@bound` and `@debounce(...)` can combine on the same method.
