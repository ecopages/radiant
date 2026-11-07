---
'@ecopages/radiant-ui': minor
'@ecopages/radiant-themes': patch
---

The toast close button now sits inside the toast, at the end of the row (at the start for toasters positioned at the start of the screen), as a 24px ghost button with a 14px icon instead of a 20px badge on the corner whose icon filled the circle. The knob arc ends follow `--rui-knob-linecap` (`round`, `butt` or `square`, default `round`); the sharp radius pack and the Zed, VS Code, High Contrast, Windows 95 and Mac OS Classic themes set `butt`, and a `--rui-radius-scale` of exactly 0 squares the ends too.

Tags in `RuiTagGroup` and their remove buttons follow the radius scale (`--radius-control` and `--radius-sm`) instead of staying fully rounded, so a square or lightly rounded theme gets square tags.
