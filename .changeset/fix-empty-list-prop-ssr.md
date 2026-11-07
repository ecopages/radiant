---
'@ecopages/radiant': patch
---

Server-rendered hosts now write a `@prop` with a `transform.toAttribute` through it instead of its raw type converter. An empty `string[]` value, such as an unselected combobox, select, listbox or checkbox group, no longer renders `value="[]"`, which the client read back as a selected value named `[]` and showed in the input.
