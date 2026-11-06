---
'@ecopages/radiant-ui': patch
---

`rui-slider` range thumbs now stop at `minDistance` on Home and End instead of jumping across the other thumb, and the held thumb rounds away from the other one so a step that does not divide `minDistance` never leaves them closer than the gap. Pointer drag also stops at the gap now instead of swapping the thumbs.
