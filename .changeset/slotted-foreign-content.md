---
'@ecopages/radiant': patch
---

Security fix: a host whose view puts `<slot />` inside `svg` or `math` no longer lets text in a slotted `style`, `xmp`, `noframes` or other raw-text tag create elements in SSR output. The slotted light-DOM nodes were emitted as HTML, where that text is raw, while the browser parses them as foreign content. They are now emitted in the namespace of the slot, so the text is entity-escaped and the browser decodes it back to the same characters, for default and named slots, in plain and hydrate mode, and for nested hosts among the slotted children. A slot in HTML, or under an SVG `foreignObject`, `desc` or `title`, emits CSS such as `@media (width < 600px)` unchanged. Client rendering is unchanged.
