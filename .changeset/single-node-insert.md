---
'@ecopages/jsx': patch
---

Insert a single node directly instead of through a `DocumentFragment`. Most template instances have one root node, so creating 1,000 rows gets about 20% faster.
