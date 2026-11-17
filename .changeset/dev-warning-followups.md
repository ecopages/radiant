---
'@ecopages/radiant': patch
---

Reword the hot-field development warning to name both remedies: bind a field that fills one node or attribute with `this.$`, or move a per-frame value that shapes the view's structure (a list length, a branch) out of `render()`. A production build now drops every render-warning hook instead of keeping the `?.` call sites, and a field stops being counted once it has warned. `@controller`, `registerController` and `replaceController` now throw on an identifier that contains `:`, because a controller's hydration key is `<identifier>:<field>`; rename such a controller. No identifier in this repository contained one.
