---
'@ecopages/radiant': minor
---

Serialize each Element Host once per `renderComponent()` call, so host attributes, view content, and provider hydration payloads describe the same prepared state. `preview` now wraps that markup, matching `renderController()`. Callers of `renderComponentWithPreview()` in plain mode no longer receive a hydrate-mode preview with `data-radiant-ssr` and hydration markers.

**Breaking:** Server rendering resolves consumed context after construction: before `initialize` (`renderComponent`, and `renderController` inside an active provider) and before `@onUpdated` callbacks. A host gets one `connectedContextCallback`, mounted event and context update callback per provider and value. Constructors and field initializers no longer see consumed context during SSR; read it in `initialize`, `@onUpdated` or `render()`.

Custom server adapters: `runSsrPreparationCallbacks(host)` no longer resolves consumed context. Call `runSsrPreparationCallbacks(host, true)` first, inside the SSR provider scope, then `runSsrPreparationCallbacks(host)`.
