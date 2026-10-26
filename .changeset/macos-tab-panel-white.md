---
'@ecopages/radiant-themes': patch
'@ecopages/radiant-ui': patch
---

Keep the open navigation menu trigger filled under the pointer in every theme; a theme's ghost-button hover used to replace the fill while the text kept its on-container color, so Windows 95 showed white text on gray. The macOS theme also fills boxed tab panels with the white content surface instead of a gray tint, and keeps pressed ghost buttons filled on hover.

The Windows 95 theme draws a calendar inside a date popover without its own raised frame, so the popover is one bevel and the calendar title bar sits 3px from it.

macOS calendar days are circles, and a selected range is one continuous band with a disc on each end instead of a row of separate ovals.
