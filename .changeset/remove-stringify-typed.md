---
'@ecopages/radiant': minor
---

Removed `@ecopages/radiant/tools/stringify-typed`.

`stringifyTyped` was only a typed wrapper around `JSON.stringify(...)` and encouraged passing structured state through string channels where real property bindings or explicit hydration payloads are a better fit.

Use the following replacements instead:

- pass structured custom-element data with real property bindings
- use `JSON.stringify(...)` when a transport is genuinely string-based
- use `@ecopages/radiant/tools/escape-script-json` when embedding serialized JSON into `<script type="application/json">` payloads

This also updates the docs and examples to prefer direct prop injection for custom elements and explicit JSON script payloads for SSR hydration.
