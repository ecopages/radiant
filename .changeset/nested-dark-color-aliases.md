---
'@ecopages/radiant-ui': patch
---

A nested `.dark` section on a light page now restyles kit components: the semantic color utilities read the palette variables where they are used, and the `--color-*` aliases are redeclared in the dark scope.
