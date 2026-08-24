---
'@ecopages/radiant-ui': minor
---

Move composite JSX APIs to view-owned light-DOM shells so parent reconciliation no longer fights custom-element slot projection.

**@ecopages/radiant-ui**

- Composite `Rui*` views now own chrome and author children in the light DOM; coordinating custom elements query `data-ref` / `data-*` targets and toggle volatile attrs imperatively instead of re-rendering through CE `<slot>`.

    This is a breaking pre-1.0 change for consumers who authored the previous slot-based markup directly: migrate to the documented `Rui*` view helpers or equivalent light-DOM structure.

- Migrated composites include table, dialog, form, field, select, listbox, checkbox, combobox, autocomplete, menu-button, tooltip, hover-card, switch, breadcrumb, popover, toolbar, grid, tree, treegrid, tag-group, menubar, disclosure (and group), window-splitter, number-field, navigation-menu, carousel, and sidebar (with trigger).
- Popup visibility and placeholder state use `toggleAttribute` so parent re-renders do not fight `moveRangeBefore`.
- Table sync narrows imperative `tabIndex` updates to structure changes and keyboard focus, avoiding churn during `aria-busy` refreshes.
