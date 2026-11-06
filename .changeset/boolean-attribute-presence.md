---
'@ecopages/jsx': minor
---

A boolean on a standard HTML boolean attribute such as `hidden` or `disabled` now binds by presence on every path, on the client and in SSR. Before, a binding whose first value was not a boolean, such as a signal that starts as `undefined`, wrote `hidden="false"` when the value turned `false`, which browsers read as present, so the element stayed hidden; `attr:hidden={false}` did the same. `true` now writes the attribute empty and `false` removes it; a string such as `hidden="until-found"` is written as given, also after the binding held a boolean.

Add the `bool:` prefix to bind any attribute by presence, such as a custom element's boolean attribute: `<x-panel bool:expanded={isOpen} />` writes `expanded` for `true` and removes it for `false`, `null`, `undefined` or `''`; a non-empty string is written as given.
