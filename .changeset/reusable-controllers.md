---
'@ecopages/radiant-ui': patch
---

Add the `@ecopages/radiant-ui/controllers` and `@ecopages/radiant-ui/helpers` entries, the reusable logic Radiant UI components are built from.

Controllers attach to a host and tear down with it, each with a `createX(host, config)` factory: event listeners, mutation and resize observation, dismissal, popover, portal, focus trap, scroll lock, roving tabindex, swipe, pointer drag, sortable (with drag between containers), and the listbox popover, menu tree and calendar popover controllers. Main controllers expose `protected` hooks at their decision points. `SwipeController` is built on `PointerDragController` and reports a release outside the element.

Helpers are the pure logic behind them: date, selection and segment logic, masks, number formatting, parsing and numeric ranges, text filtering, `cycleValue`, `uniqueId` and `isCssSafeId`, ordering and floating-position decisions.

`rui-tag-group` gains an opt-in `reorderable` attribute and a `rui-reorder` event; Space lifts a tag instead of selecting it. The carousel flips its swipe direction in right-to-left layouts, `rui-dialog` releases its scroll lock and returns focus when it disconnects while open, and pointer drags ignore a non-primary button.
