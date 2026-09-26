---
'@ecopages/radiant-ui': patch
---

Hide the inactive sidebar trigger again before hydration, and read trigger placement only from the `placement` attribute (the `rui-sidebar-trigger-placement--*` class and `data-placement` are no longer read, and the class is no longer emitted).
