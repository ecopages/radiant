---
'@ecopages/radiant': minor
---

`@controller`, `registerController` and `replaceController` now throw on an identifier that contains `:`, because the hydration key of a controller is `<identifier>:<field>` and a `:` makes it ambiguous. Rename such a controller; no identifier in this repository contained one.
