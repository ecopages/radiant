---
'@ecopages/radiant-ui': patch
---

A select or combobox inside an invalid field now shows the error border, like the input and textarea. `RuiSidebarProvider` with `layout="docs"` also reads its header and body max width from a new `--rui-sidebar-container` variable (default `--container-7xl`), so you can widen the layout without overriding Tailwind's global container token.
