---
'@ecopages/radiant-ui': patch
---

Follow-ups to the reusable controllers.

`SwipeController` takes `minVelocity` and `dominance`, so a short fast flick counts and a diagonal drag does not, and `PointerDragController` reports `elapsedMs`. `FocusTrapController` takes `getEnabled` and `getReturnFocus` and has `focusFirst()` and `focusLast()`. `SortableController` has an opt-in `preview` that lifts the item out of its container to follow the pointer, with a placeholder that marks where it will land. `ScrollLockController` takes a `getTarget`, so an app shell with an inner scroll container can lock it.

Select, combobox, date-field and date-range-picker gain a `portal` option, off by default, and every portal-capable popup (those four, `rui-popover` and `rui-hover-card`) gains `portalContainer`, a selector, element or function resolved when the popup opens.

A portaled popup inside a popover no longer closes it: a node moved by `PortalController` counts as inside the surface it came from.
