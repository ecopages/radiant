---
'@ecopages/radiant-ui': patch
---

`rui-sidebar` puts its `label` only on the `complementary` landmark (the host); the roleless pane no longer carries an ignored `aria-label`. The `RuiSidebar` view stamps `role="complementary"` so server-rendered markup has a named landmark before hydration.
