---
'@ecopages/radiant-ui': patch
---

Fix `RuiTooltip` rendering its trigger and tooltip surface twice in the browser. `<rui-tooltip>` no longer overrides `render()`; the view stamps the only shell, so there is one `[data-ref="trigger"]` and one `[role="tooltip"]` that the trigger's `aria-describedby` points at. A bare `<rui-tooltip content="...">` without the `RuiTooltip` view no longer renders a trigger and surface by itself: author them with the `data-ref="trigger"` and `data-ref="tooltip"` light-DOM contract and set `content`, which replaces the surface text.
