---
'@ecopages/radiant': patch
---

Fix two SSR minimal-DOM parsing bugs. Markup-like strings inside `script` and `style` (such as `"<div>"`) no longer open tags and swallow the rest of the parent element, and `textContent` of parsed HTML no longer leaks attribute text after a `>` in an attribute value or decodes script content.
