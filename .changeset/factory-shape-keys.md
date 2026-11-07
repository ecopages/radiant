---
'@ecopages/jsx': patch
---

Render faster by finding a JSX element's compiled template without building a string key on every render. Updating a 1,000-row table drops from about 15 ms to about 5 ms in Chromium, and creating 10,000 rows from about 550 ms to about 270 ms.
