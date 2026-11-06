---
'@ecopages/jsx': patch
---

Swapping two rows of a keyed list now moves only those two rows. The renderer used to move every row between the two swapped rows to keep the order, so a swap in a 1,000-row list made about 6,000 DOM mutations and took 121 ms in the js-framework-benchmark, against 13.5 ms for vanilla JS. It now keeps the longest run of rows already in order and moves only the rest.
