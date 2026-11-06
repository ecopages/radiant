---
'@ecopages/jsx': patch
---

Fix quadratic list rendering. Clearing a child range used a DOM `Range` per call, and browsers update every live `Range` on each DOM mutation until it is garbage collected, so rendering 1,000 keyed rows took about 0.9 s and 4,000 rows about 43 s in Chromium, and later renders slowed further. The nodes are now removed directly: 1,000 rows render in about 25 ms and the time grows linearly.
