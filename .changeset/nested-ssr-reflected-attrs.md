---
'@ecopages/jsx': patch
'@ecopages/radiant-ui': patch
---

Serialize nested custom-element light DOM with the active SSR renderer.

**@ecopages/jsx**

- Registered custom elements inside another server-rendered custom element now preserve the active SSR custom-element renderer and hydration state.

**@ecopages/radiant-ui**

- `RuiCycleToggle`, `RuiRadioGroup`, and `RuiSelect` no longer need `attr:` prefixes for ordinary host props during nested SSR.
