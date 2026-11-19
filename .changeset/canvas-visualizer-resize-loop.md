---
'@ecopages/radiant-ui': patch
---

Canvas audio visualizer presets no longer report `ResizeObserver loop completed with undelivered notifications` on `window` when their container resizes: the canvas refits on the next animation frame.
