---
'@ecopages/radiant': patch
---

Flush post-sync callbacks during custom-element SSR so `@bindTo` copies reactive fields onto light-DOM targets before serialization.
