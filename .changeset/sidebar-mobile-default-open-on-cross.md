---
'@ecopages/radiant-ui': minor
---

Apply `mobileDefaultOpen` when the viewport crosses into mobile, not only on first connect.

**@ecopages/radiant-ui**

- Uncontrolled `rui-sidebar` now closes (or opens) to `mobileDefaultOpen` when resizing below `mobileBreakpoint`, so a desktop-open pane does not become an overlay drawer.
- Controlled `open` is left unchanged on viewport crossings; listen to `rui-sidebar-mobile-change` if the parent needs to react.
