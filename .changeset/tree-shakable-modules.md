---
'@ecopages/radiant': patch
'@ecopages/jsx': patch
'@ecopages/signals': patch
---

Publish one file per source module so bundlers can tree-shake Radiant, JSX and Signals, and ship the JSX renderer only to apps that use JSX.

- The dists are built with Rolldown `preserveModules` and keep `@__PURE__` annotations. `@ecopages/jsx` now declares `sideEffects`. Importing one decorator from `@ecopages/radiant` costs about 3 kB, not about 84 kB.
- Radiant no longer imports the JSX DOM renderer. `@ecopages/jsx` installs it when `@ecopages/jsx/jsx-runtime` loads and on the first `jsx()` call, and Radiant reads it through `getDomRenderer()`, so existing apps need no changes. An element without a JSX view no longer bundles the renderer: the js-framework-benchmark `radiant` app drops from 92 kB to 47 kB. Without the renderer, a view that returns a plain value or a DOM node still renders; any other non-JSX view needs `import '@ecopages/jsx/jsx-runtime'` once, and `render()` throws an error naming it otherwise.
- `ContextEventsTypes` from `@ecopages/radiant/context` is a constant object instead of a TypeScript `enum`. Values and the `ContextEventsTypes` type are unchanged; a member used as a type, such as `ContextEventsTypes.PROVIDER`, becomes `typeof ContextEventsTypes.PROVIDER`.
- `@onEvent({ ref })` builds its part selector once per listener instead of on every event.
