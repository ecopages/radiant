---
'@ecopages/radiant': patch
---

The server selector engine throws a `SyntaxError` for a pseudo-class or pseudo-element written after a tag name (`p:first-child`, `a:hover`, `p::before`) instead of silently matching nothing. As in a browser, a namespaced tag is written with an escaped colon (`svg\:rect`); `svg:rect` now throws.
