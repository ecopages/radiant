---
'@ecopages/radiant': patch
---

The server selector engine throws a `SyntaxError` for a pseudo-class or pseudo-element written after a tag name (`p:first-child`, `a:hover`, `p::before`) instead of silently matching nothing.
