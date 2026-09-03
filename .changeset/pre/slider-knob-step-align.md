---
'@ecopages/radiant-ui': patch
---

Stop slider and knob from rewriting reflected `value` when clamp only differs by IEEE rounding, which stacked overflow on the docs page.
