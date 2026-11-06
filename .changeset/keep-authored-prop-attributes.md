---
'@ecopages/radiant': patch
---

Fix: a `@prop` without `reflect: true` no longer removes its authored attribute when the element upgrades. `reflect` now only controls writing property changes back; markup such as `<creature-card name="Rex">` keeps `name` after upgrade. The attribute is read once at upgrade and is not kept in sync by later property writes. Code that relied on the attribute disappearing, such as `:not([name])` selectors or `getAttributeNames()` checks, will now see it.
