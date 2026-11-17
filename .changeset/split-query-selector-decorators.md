---
'@ecopages/radiant': minor
---

Add `@query(selector)` and `@queryAll(selector)`, with `createQuery(host, selector)` and `createQueryAll(host, selector)` for plain JS: the first match or `null`, and an array of every match, each read live and reaching into nested hosts. Under standard decorators the field type must accept `null` for `@query` and be an array of elements for `@queryAll`.
