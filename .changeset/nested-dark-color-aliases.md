---
'@ecopages/radiant-ui': patch
---

A nested `.dark` section on a light page now restyles kit components: the semantic color utilities read the role tokens (`--primary`, `--surface`, ...) directly where they are used, and the `--color-*` aliases are declared on `:root` and `.dark`, so they exist on a light page and follow a nested dark scope. Themes and apps should override the roles (`--primary`), not the `--color-*` aliases.
