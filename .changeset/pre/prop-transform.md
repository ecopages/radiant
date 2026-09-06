---
'@ecopages/radiant': patch
---

Add optional `transform` to `@prop` for custom attribute ↔ property conversion, including `fromProperty` normalization on JS writes and omission of reflected attributes when `toAttribute` returns null or an empty string.
