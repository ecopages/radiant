---
'@ecopages/jsx': patch
'@ecopages/radiant': patch
---

`<script>` children are now text-content parts on the client like other raw-text children, so a signal child stays live. String SSR joins each element's children before escaping. In HTML it rewrites only the element's matching closing-tag sequence, so CSS such as `@media (width < 600px)` stays byte-identical; inside `svg` or `math`, where these tags are ordinary elements, it entity-escapes the text. `RAW_TEXT_ELEMENT_NAMES` is exported from `@ecopages/jsx/server`, which Radiant uses for its server HTML parser.

A `foreignObject` inside `<math>` keeps its MathML parsing, so raw-text tags under it are entity-escaped; only an SVG `foreignObject` switches back to HTML.
