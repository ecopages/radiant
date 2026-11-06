---
'@ecopages/radiant': patch
---

The server DOM shim reflects `name`, `href`, `slot`, `role`, the `aria*` string properties and `option`/`button` `value` as attributes, so values set as properties during SSR (such as the radio group name) reach the server HTML.
