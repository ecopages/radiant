---
'@ecopages/vite-plugin-radiant': patch
---

Strip `declare` class fields, such as `declare readonly [JSX_PROPS]?: Props`, before decorator lowering, so a decorated class that declares one compiles.
