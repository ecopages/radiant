---
'@ecopages/radiant': patch
---

Security fix: SSR no longer lets Authored Children text create elements when it sits in a `style`, `script`, `xmp`, `iframe`, `noembed` or `noframes` tag inside `svg` or `math`. Those tags are ordinary elements there, so their text is now entity-escaped. In HTML they stay raw text, and only a matching closing tag (`</style` followed by whitespace, `/` or `>`) is rewritten, also when it is split across text nodes, so CSS such as `@media (width < 600px)` is emitted unchanged.
