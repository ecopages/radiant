---
'@ecopages/radiant-ui': minor
---

Expose host-level `--rui-*` CSS knobs with catalog defaults so instances can be restyled in CSS without a JS theme object.

**@ecopages/radiant-ui**

- Public knobs are declared on the host (or the portaled surface). Do not set them on an inner grain — that blocks inheritance.
- Switch, dialog, tooltip, tabs, knob, and avatar declare defaults on the host or root class. Popover and hover-card declare them on the portaled panel class.
- Toaster stack variables are prefixed (`--rui-toaster-width`, `--rui-toast-y`, …). `gap` and `offset` attributes still win over CSS.
