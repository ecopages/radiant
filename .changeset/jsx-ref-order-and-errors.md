---
'@ecopages/jsx': patch
---

Run nested `ref` callbacks child before parent, as React 19 does, so a parent's callback sees every ref in its subtree attached; detaches still run parent before child. This changes the order: refs used to attach parent first. A `ref` callback or cleanup that throws is now reported as an uncaught error without stopping the other refs, property writes or disposal of the same pass.
