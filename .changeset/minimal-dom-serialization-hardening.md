---
'@ecopages/radiant': patch
---

Harden the SSR minimal DOM serializer. Serializing a tree after a mutation no longer takes time exponential in its depth, parsed text is only written back from its source while that source still means the same thing, and self-closing custom elements nested in parsed markup serialize with an explicit close tag so browsers re-parse the same tree.
