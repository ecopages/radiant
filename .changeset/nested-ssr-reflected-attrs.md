---
'@ecopages/radiant-ui': patch
---

Serialize reflected cycle-toggle and select fields with `attr:` for nested SSR.

**@ecopages/radiant-ui**

- `RuiCycleToggle` and `RuiSelect` now emit reflected host attributes during plain nested SSR, so values such as `variant="ghost"` survive hydration inside another custom element.
