---
'@ecopages/radiant-ui': patch
---

Slider and knob round snapped values to the decimal places in `step` (or an explicit `precision`) and accept `parseValue` for custom numeric transforms, so fractional steps no longer emit binary float noise.
