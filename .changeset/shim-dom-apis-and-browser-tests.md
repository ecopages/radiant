---
'@ecopages/radiant': patch
---

The SSR minimal DOM gains the node-traversal and node-editing APIs that component code reads: `prepend`, `before`, `after`, `replaceWith`, `remove`, `firstChild`, `lastChild`, `nextSibling`, `previousSibling`, the `*ElementChild` / `*ElementSibling` accessors, `childElementCount`, `document.createComment` and `document.createElementNS`.

The DOM-detection probe no longer reads accessors on an object that is not an element. Real engines reject that read with "Illegal invocation", so SSR setup now works when it runs inside a browser.
