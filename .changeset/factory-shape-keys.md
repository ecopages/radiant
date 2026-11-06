---
'@ecopages/jsx': patch
---

Render faster by finding a JSX element's template without building a string key on every render. Elements share their binding descriptors, and the key comes from a tree of tags and descriptors. Updating a 1,000-row table drops from about 15 ms to about 5 ms in Chromium, and creating 10,000 rows from about 550 ms to about 270 ms.
