---
'@ecopages/jsx': patch
---

**Breaking:** Each hydrate-mode `renderToString(...)` without explicit binding state starts its marker indexes at 0, even inside `withActiveSsrScopeValue(...)`. Integrations that render sibling roots of one hydration root must wrap them in `withServerHydrationBindingState(createServerHydrationBindingState(), () => ...)` so the client sees one continuous marker stream.
