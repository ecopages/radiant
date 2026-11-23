---
'@ecopages/radiant-ui': patch
---

A Radiant UI control wrapped by a custom field host keeps the host's labelling. A host registered with `registerFieldControl` that paints the field's ARIA onto a nested `rui-select`, `rui-combobox`, `rui-listbox`, `rui-number-field` or `rui-date-field` target no longer loses `aria-labelledby`: `fieldAria` and `fieldAriaBindings` now also set `data-rui-field-managed` on the target they paint, and Radiant UI controls never relabel a field-managed target (a stale `aria-label` beside the painted `aria-labelledby` is dropped). A control whose target no field or field host paints keeps labelling itself.

Pressing Tab in an open `rui-combobox` or `rui-select` with `selection-mode="multiple"` no longer toggles the active option off: Tab closes the popup and keeps the selection. In a single `rui-select`, Tab now picks the active option even with `should-close-on-select` set to false, as a single `rui-combobox` already did, and the popup closes as focus moves on.
