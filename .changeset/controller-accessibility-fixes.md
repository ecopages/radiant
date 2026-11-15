---
'@ecopages/radiant-ui': patch
---

Fix accessibility defects in the behavioural controllers.

- Escape: `DismissController` sends it to one layer per key press, the top-most nested open one first, and ignores it while an input method is composing. An Escape whose default a handler already prevented reaches no layer. `onDismiss` may return `false` for an Escape it did not act on, and the key then goes to the next layer; any other return value counts as handled. A closed `rui-select` or `rui-combobox` no longer prevents Escape, so an enclosing dialog or popover still closes; `rui-combobox` prevents it only when it clears its text. A window blur or tab switch is no longer treated as focus leaving.
- Modifier keys: `RovingController` and `MenuTreeController` leave Alt, Ctrl and Meta keys to the browser.
- Roving and text fields: `RovingController` leaves keys typed in a text field that is not an item alone (a textarea, a contenteditable element, or an input of type text, search, email, url, tel, password, number or a date type). Checkboxes, radios, buttons, ranges and selects nested in an item stay navigable. `isRovingKeyIgnored` is exported.
- Focus loop: `FocusTrapController`, and `rui-dialog` with it, loops over visible, enabled, non-inert focusable elements only, skipping `[hidden]`, `[inert]`, `visibility: hidden` and controls disabled by a `<fieldset disabled>` ancestor. `getFocusableElements` relies on `checkVisibility`. `queryFocusableCandidates` and `findFirstFocusableCandidate` now also match `summary`, `[contenteditable]`, `audio` and `video` with `controls`, and `iframe`, and skip `input[type=hidden]` and `contenteditable="false"`; `rui-tooltip` and `rui-hover-card` use them to find their trigger and first focusable, so they can resolve a different element than before.
- Menus: `MenuTreeController` closes only the focused submenu on Escape, supports `menuitemcheckbox` and `menuitemradio`, including inside a `role="group"`, and lets only a `menuitem` own a submenu.
- Option ids: `setCollectionActive` gives options unique ids from `uniqueId(idPrefix)` instead of `${idPrefix}-${index}`, so code or tests that look an option up by `prefix-0` need updating.
- Sortable: `SortableController` cancels a pointer drag on Escape and adds `move` and `moveBy` for a non-drag alternative. `SortableSource` gains `'programmatic'`, so an exhaustive `switch` over it needs a new case.

The controller docs list what each controller does and what the component must provide.

Popups inside a dialog.

- `PopoverController` portals into the nearest `[aria-modal="true"]` ancestor of the anchor when no `getPortalContainer` is given or it returns `null` (an open modal `<dialog>` counts too), so `rui-popover` and `rui-hover-card` opened inside a `rui-dialog` render above it instead of below its z-index.
- A click on the `rui-dialog` backdrop that closes a popup inside it no longer also closes the dialog.
- `rui-popover` sets `aria-haspopup="dialog"` on its trigger.
- `rui-tooltip` closes on Escape through `DismissController`, so inside a dialog the first Escape hides the tooltip and the second closes the dialog.
- `rui-menu-button` also closes when focus leaves it, so a menu does not stay open in a dialog that closed.

Consumer-visible effects of a popup that portals into a modal surface instead of `document.body`: it inherits the surface's text color, font and alignment, selectors such as `.my-dialog button` now reach its content, its items join the dialog's Tab order at the end of the surface, and code that looks for the popup under `body` will not find it. Floating positions are corrected for an ancestor that is a containing block for fixed elements (`transform`, `filter`, `contain`), and recomputed when a transition ends on one. `rui-menu-button` sets `tabindex="-1"` on its menu so a press on a separator, padding or disabled item keeps focus inside. `rui-popover` removes the `aria-*` it set on its anchor when it disconnects or the anchor changes, and keeps an `aria-haspopup` the anchor already has.
