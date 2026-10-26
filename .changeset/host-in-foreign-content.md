---
'@ecopages/jsx': patch
'@ecopages/radiant': patch
---

Security fix: a custom element placed inside `svg` or `math` no longer lets text in a `style`, `xmp`, `noframes`, `iframe` or other raw-text tag under it create elements in SSR output. Its light DOM and view used to serialize as HTML, so that text was emitted raw, while the browser parses it as foreign content. They now serialize in the namespace the element sits in: the text is entity-escaped, and the browser decodes it back to the same characters. This covers a host's Authored Children, its own `render()`, a Children Value from a parent view, slotted children and nested hosts. Under an SVG `foreignObject`, and anywhere in HTML, CSS such as `@media (width < 600px)` is still emitted unchanged. Custom-element render hooks get the namespace as `context.foreignContent`, and `renderToString` and `renderServerLightDom` accept it, so an integration that serializes a host itself can do the same.
