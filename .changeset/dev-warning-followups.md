---
'@ecopages/radiant': patch
---

Reword the hot-field development warning to name both remedies: bind a field that fills one node or attribute with `this.$`, or, when the field shapes the view's structure (a list length, a branch), derive a coarser field for `render()` and keep the fast value in bindings. A production build no longer ships the render-warning code paths, and a field stops being counted once it has warned. The `@attr` function-value warning now names the host class like `@bindTo` does, and on the server an `Object` or `Array` `@prop` that holds a function logs only the skip warning, not the lossy-attribute one as well. That skip warning for a reflected attribute now names the host tag, so each tag warns once.
