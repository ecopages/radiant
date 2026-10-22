---
'@ecopages/radiant-themes': patch
---

macOS tabs render as a 24px segmented control at 13px in both tab variants, and boxed tabs sit on the top edge of their panel, as `NSTabView` does. The catalog's variant styles no longer override the theme's tab size, padding and font.
