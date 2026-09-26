---
'@ecopages/radiant': minor
---

Serialize false-default booleans as HTML presence on SSR and the client. Booleans that default to `true` still emit `"true"` / `"false"` so an explicit false survives upgrade.
