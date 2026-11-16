---
'@ecopages/radiant': patch
'@ecopages/jsx': patch
---

**@ecopages/radiant**

- Bindings such as `this.$.data.position` update when a `createStore(...)` path changes, a missing key is added, or the host member is replaced.

**@ecopages/jsx**

- Object-valued bindings expose typed nested members such as `binding.profile.name`.
