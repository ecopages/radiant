---
'@ecopages/jsx': patch
'@ecopages/radiant': patch
---

Raw-text children stay as normal text-content parts on the client, so signal children remain live. String SSR joins each element's children before escaping: `style` replaces every `<` with the CSS escape `\3c `, while `script`, `xmp`, `iframe`, `noembed`, and `noframes` rewrite only their matching closing-tag sequence. `RAW_TEXT_ELEMENT_NAMES` is exported from `@ecopages/jsx/server`, which Radiant uses for its server HTML parser.
