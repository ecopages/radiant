---
'@ecopages/radiant-ui': patch
---

Slider and knob unfilled tracks use `--rui-track-fill` (a mix of `--on-background`) so they stay visible on matching surfaces. `RuiSlider` and `RuiKnob` seed readout text and range geometry during SSR.
