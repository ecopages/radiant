---
'@ecopages/radiant-ui': patch
---

Publish the live `FormStore` on `formContext.store` so scoped consumers can read and mutate values without reaching into the host.

Hydration payloads still contain presentation only (`ready`, `revision`, `fields`, `errors`).
