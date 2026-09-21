---
'@ecopages/radiant-ui': patch
---

Server-render `rui-sidebar-trigger` from the view that creates it so docs layouts include the toggle button, ARIA, and glyph before client JavaScript runs. The trigger host owns button presentation during SSR preparation and uses a stable accessible name (`triggerLabel`, defaulting to `Toggle sidebar`) across all placements.
