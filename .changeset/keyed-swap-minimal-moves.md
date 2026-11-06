---
'@ecopages/jsx': patch
---

Swapping two rows of a keyed list now moves only those two rows. The list kept every row after the first moved one in place by moving it too, so a swap in a 1,000-row list made about 6,000 DOM mutations and took 121 ms in the js-framework-benchmark, against 13.5 ms for vanilla JS. The renderer now keeps the longest run of rows already in order and moves only the rest.
