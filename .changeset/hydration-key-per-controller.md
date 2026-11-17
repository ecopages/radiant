---
'@ecopages/radiant': patch
---

Fix `@provideContext` and `@signal` hydration so several controllers on one element, or a controller and the element host, no longer read each other's payload. A hydration script written for a controller with an identifier now carries `data-hydration-key="<identifier>:<field>"` instead of the bare field name; an element host keeps the bare key.
