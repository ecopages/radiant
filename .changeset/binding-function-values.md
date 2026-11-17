---
'@ecopages/radiant': patch
---

Stop `@bindTo` (`attr` and `text`), `@attr`, a reflected `@prop` and the server controller and host attributes from writing a function value out as its source code. A function in those positions now renders as nothing (attribute removed, text empty), and development builds warn once per position. `prop` bindings and event handlers still keep a function as a value.
