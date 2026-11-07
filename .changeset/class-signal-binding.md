---
'@ecopages/jsx': patch
---

A signal or subscribable in `class` or `classes` binds the class attribute live, its value normalized like a static class value (a string, a list or a class map). It was read as a class map, so `class={signal}` rendered the signal's own field names as classes.
