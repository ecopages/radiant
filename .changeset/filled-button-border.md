---
'@ecopages/radiant-ui': patch
---

Filled and destructive buttons use a border in their own fill color, including their hover, active and pressed states, instead of a transparent one. At fractional zoom or display scaling the transparent border let the fill end a pixel or two short and soft next to an outline button, which looked like a height difference; the border now snaps to whole device pixels like the outline button's.
