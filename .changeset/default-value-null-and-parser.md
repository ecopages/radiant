---
'@ecopages/radiant': patch
---

Accept a `null` `defaultValue` on `@prop` and `@attr`, and skip the `defaultValue` check against `type` when a `transform.fromAttribute` or `converter.fromAttribute` parser is given. Both used to throw, `@prop` when the class loaded and `@attr` when the attribute was installed. A wrong default without a parser still throws. An `@attr` with `type` and `defaultValue: null` now reads `null` when the attribute is absent instead of the type default.
