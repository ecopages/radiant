---
'@ecopages/radiant-ui': patch
---

Bind more catalog fields to light DOM declaratively.

**@ecopages/radiant-ui**

- More fields bind to light DOM declaratively via `@bindTo` (slider, knob, sidebar, sidebar-trigger, toast, toaster, date-field, date-range-picker, combobox, select, carousel). Note: `rui-toast` `dismissible` and `variant` changes now also re-sync their `data-*` attributes at update time, which previously required a remount.
