---
'@ecopages/radiant-ui': patch
---

Fix `MediaController` reporting `loading` after a host removes the element's `src` and calls `load()`. The status is now `idle` as soon as `emptied` fires, instead of staying `loading` until the next media event.
