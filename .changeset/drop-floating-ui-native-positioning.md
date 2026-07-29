---
'@ecopages/radiant-ui': minor
---

Remove `@floating-ui/dom` and position tooltips and menu buttons with an in-package floating helper.

**@ecopages/radiant-ui**

- Drop the `@floating-ui/dom` dependency.
- `rui-tooltip` and `rui-menu-button` use `computeFloatingCoords` / `attachFloating` for fixed placement, primary-axis flip by free space, and cross-axis viewport clamping.
- Close open menubar menus when activating a top-level item without a submenu.
