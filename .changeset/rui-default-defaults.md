---
'@ecopages/radiant-ui': patch
---

Radiant Default's defaults change: `--rui-radius-scale` is 0.7, `--rui-border-alpha` is 11%, and the neutral seed now reads a new `--rui-neutral-tint` multiplier (default 1.3) that scales the grey chroma, so the greys carry a visible hint of the neutral hue. The docs tuner offers border opacity from 0 to 100%.

Check boxes and radios take their size from `--rui-choice-size` (default `1rem`, so every other theme is unchanged); Radiant Default sets it from `--size-control-sm`, so they follow `--rui-density`. Their keyboard focus ring offset is 1px instead of 2px.

In dark mode the pressed and active fills of filled controls (`--primary-dark`, `--secondary-dark`, `--error-dark`, `--success-dark`, `--info-dark`, `--warning-dark`) are now one step darker than the resting color but still light, so the near-black `on-*` text keeps its contrast. They used the dark shades of the light mode, which put dark text on a dark fill when a filled button was pressed or selected.
