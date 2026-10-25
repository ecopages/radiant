---
'@ecopages/jsx': patch
---

Keep nodes when a child list empties or a conditional child toggles. A child expression now keeps its place in the template whatever value it holds, so the template shape follows the authored markup: `<section>{items.map(…)}</section>` keeps the `<section>` (or custom element host) when `items` becomes empty, and `<>{a}{cond ? b : null}</>` keeps `a` when `cond` flips. Rebuilt nodes used to lose focus, typed input, scroll position and custom element state. SSR markup is unchanged.

The values `jsx()` and `jsxs()` produce change shape accordingly. A fragment with several children resolves to one entry per child, with `null` for an empty one, and a non-empty list stays a list even with one entry, where it used to collapse to its only item. Lists are no longer flattened: an empty item stays a `null` entry and a nested list stays one nested entry, even when all its items are keyed. When every filled item is itself keyed, the list drops its holes and reconciles by key. Hydrating a fragment root that holds a nested list now reconnects the server DOM instead of falling back to a client render.
