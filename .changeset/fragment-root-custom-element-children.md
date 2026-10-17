---
'@ecopages/jsx': patch
---

Fix hydration of reactive bindings inside a custom element's JSX children when the render root is a fragment. A custom-element child of a fragment root was hydrated like an ordinary element, so the bindings in its children kept their server values. It is now reconciled the same way as under a non-fragment root.
