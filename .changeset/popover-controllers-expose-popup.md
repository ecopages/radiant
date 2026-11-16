---
'@ecopages/radiant-ui': patch
---

Add `PortalController.mountedNode`, the node it holds out right now. `PopoverController.getFloatingElement()` now returns the element `getFloating` finds or, while the popup is portaled and the owner cannot find it, the portal's mounted node, including during the exit transition. It no longer remembers the last element it saw, so a popup the owner replaced is never returned stale.

`select`, `combobox`, `date-field` and `date-range-picker` find their popup while it is portaled and during its exit transition, `rui-popover` reads its surface the same way, and `rui-hover-card` keeps `aria-label` on its content in sync with `content-label` while the content is portaled.
