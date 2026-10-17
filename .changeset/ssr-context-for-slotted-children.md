---
'@ecopages/jsx': patch
'@ecopages/radiant': patch
---

Context consumers passed as JSX children of a provider host now resolve that provider during SSR, where they used to render their fallback.

- **jsx:** `withServerCustomElementRenderHook` takes an `ownsChildren` option. With it, the hook context's `applyChildren()` lets the framework choose when the children serialize; `context.children` holds the raw JSX.
- **Radiant:** the bridge uses this to apply a host's children inside its context providers.

Hooks registered without the option behave as before.
