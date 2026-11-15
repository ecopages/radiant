---
'@ecopages/radiant-ui': patch
---

`CaptionsController` accepts a `getMedia` that returns `null` while the media element is not rendered yet. `attach()` does nothing then, the state reports no tracks, and a later `refresh()` or `attach()` picks the element up.
