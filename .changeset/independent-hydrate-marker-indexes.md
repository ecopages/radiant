---
'@ecopages/jsx': patch
---

Each hydrate-mode `renderToString(...)` without an explicit binding state now starts its marker indexes at 0, even inside an active SSR scope. Use `withServerHydrationBindingState(...)` when sibling roots should share one namespace.
