---
'@ecopages/radiant-ui': patch
---

Add `@ecopages/radiant-ui/controllers` and `@ecopages/radiant-ui/helpers`, the reusable logic Radiant UI components are built from.

Controllers attach to any element and tear down with the host: popover, dismiss, portal, focus trap, scroll lock, roving navigation, swipe, pointer drag, sortable drag and drop (with drop targets between containers), and mutation, resize and event-listener observers. Each has a `createX(host, config)` factory, and the decision points of the main ones are `protected` hooks you can extend. Helpers are the pure logic behind them: calendar and date logic, number formatting and parsing, masks, text filtering and ordering decisions.

`rui-tag-group` gains an opt-in `reorderable` attribute with a `rui-reorder` event. The carousel now flips its swipe direction in right-to-left layouts, `rui-dialog` releases its scroll lock and returns focus when it disconnects while open, and pointer drags ignore a non-primary button.
