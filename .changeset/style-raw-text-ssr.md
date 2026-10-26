---
'@ecopages/jsx': patch
'@ecopages/radiant': patch
---

Raw-text children stay as normal text-content parts on the client, so signal children remain live. String SSR joins each element's children before escaping. In HTML it rewrites only the element's matching closing-tag sequence, so CSS such as `@media (width < 600px)` stays byte-identical; inside `svg` or `math`, where these tags are ordinary elements, it entity-escapes the text. `RAW_TEXT_ELEMENT_NAMES` is exported from `@ecopages/jsx/server`, which Radiant uses for its server HTML parser.
