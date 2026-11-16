---
'@ecopages/radiant-ui': patch
---

Add `PortalController.mountedNode`, `getFloatingElement()` on `ListboxPopoverController` and `CalendarPopoverController`, and make `PopoverController.getFloatingElement()` return the element `getFloating` finds or, while the popup is portaled and the owner cannot find it, the portal's mounted node, including during the exit transition. It no longer remembers the last element it saw, so a popup the owner replaced is never returned stale. `select`, `combobox`, `date-field` and `date-range-picker` read their popup from their popover controller instead of a cached `@query`, and `rui-hover-card` keeps `aria-label` on its content in sync with `content-label` while the content is portaled.
