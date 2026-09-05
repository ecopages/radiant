---
'@ecopages/radiant-ui': minor
---

Paint 1:1 field-to-DOM copies on catalog hosts with `@bindTo` instead of `@onUpdated` glue.

**@ecopages/radiant-ui**

- Straight attribute, boolean, property, and text sync (hidden, aria-expanded, aria-label, input `checked` / `disabled`, and similar) now uses `@bindTo`.
- `@onUpdated` remains for procedures: focus, describedby joins, pointer math, and any branched write.
