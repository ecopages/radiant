---
'@ecopages/jsx': patch
'@ecopages/radiant': patch
---

Add the `@ecopages/jsx/raw-text-element-names` entry, which exports `RAW_TEXT_ELEMENT_NAMES` without the server renderer, and import it from Radiant's server HTML parser. The minimal DOM shim no longer loads the whole jsx server graph for one constant. `@ecopages/jsx/server` still exports it.
