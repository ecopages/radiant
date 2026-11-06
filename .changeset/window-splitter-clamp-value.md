---
'@ecopages/radiant-ui': patch
---

Window splitter: a written `value` outside 20-80 is now clamped, so the property, the reflected `value` attribute and `aria-valuenow` all hold the clamped value instead of exceeding `aria-valuemax`.
