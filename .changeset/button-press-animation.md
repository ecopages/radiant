---
'@ecopages/radiant-ui': minor
'@ecopages/radiant-themes': patch
---

Buttons now move down by `--press-shift` (1px) while pressed, the small nudge shadcn uses, using a new `--ease-out-strong` curve, and the button transition drops from 300ms to `--duration-fast` and animates only color, shadow and transform. The icon toggle and clear buttons press the same way. Button hover styling applies only on devices that support hover, and `prefers-reduced-motion` disables the movement. The Windows 95, Mac OS Classic and macOS themes set `--press-shift: 0px` so their controls do not move.
