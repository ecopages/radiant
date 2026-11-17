---
'@ecopages/radiant-ui': patch
---

`RuiButton` accepts a signal or `this.$` binding for `pressed`, so a toggle button's `aria-pressed` updates without re-rendering the host.
