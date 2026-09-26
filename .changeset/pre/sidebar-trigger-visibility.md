---
'@ecopages/radiant-ui': patch
---

`rui-sidebar-trigger` follows the sidebar's mobile mode once it attaches, including a breakpoint below 768px. Before hydration, trigger visibility uses the 768px viewport and only the sidebar that owns the trigger.
