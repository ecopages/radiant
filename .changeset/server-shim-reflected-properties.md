---
'@ecopages/radiant': patch
---

Reflect `className`, `title`, `lang`, `dir`, `hidden`, `tabIndex`, `type` and `disabled` set as properties on the server DOM into attributes, so SSR HTML keeps what a browser would serialize. `type` and `disabled` reflect only on the tags that define them.
