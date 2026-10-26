---
'@ecopages/radiant': patch
---

`@attr` derives its default attribute name with the same kebab-case rule as `@prop`, so each run of underscores collapses to one hyphen: an `@attr` field `a__b` now maps to `a-b` (was `a--b`). An explicit `source` keeps its name.
