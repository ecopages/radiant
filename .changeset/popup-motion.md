---
'@ecopages/radiant-ui': minor
'@ecopages/radiant-themes': patch
---

Popups, dialogs and value changes now animate with short, origin-aware motion. Floating popups (select, combobox, menus, popover, date pickers) fade and scale in from the side facing their anchor and leave faster than they arrive; tooltips fade; hover cards and the dialog surface scale in, and the dialog backdrop fades. The toast stack uses `--duration-slow` and `--ease-out-strong` instead of 400ms. The meter fill, slider range fill and thumb, and knob arc ease between values (sliders and knobs skip the transition while dragging through a new `data-dragging` attribute), checkbox and radio marks scale in, and disclosure, tree and treegrid chevrons share the strong ease-out. New `--popup-*`, `--tooltip-duration`, `--hover-card-enter-duration`, `--dialog-*`, `--backdrop-duration` and `--check-duration` tokens tune or disable it, `prefers-reduced-motion` removes the movement, and `PopoverController` keeps a portaled surface mounted until its exit finishes. The Windows 95 and Mac OS Classic themes set these durations to `0ms` so popups appear instantly.
