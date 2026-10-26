---
'@ecopages/radiant': patch
---

Serialize each Element Host once per `renderComponent()` call, so host attributes, view content, and provider hydration payloads describe the same prepared state. `preview` now wraps that markup, matching `renderController()`. Callers of `renderComponentWithPreview()` in plain mode no longer receive a hydrate-mode preview with `data-radiant-ssr` and hydration markers.
