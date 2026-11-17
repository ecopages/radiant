---
'@ecopages/radiant': minor
---

Remove the `@query` options object, `@query({ ref })` and `cache`, with the options form of `createQuery` and the `QueryConfig` type. `@query(selector)` and `@queryAll(selector)` read live with no cache, and `@ref` and `@refAll` read the `data-ref` parts a host owns, so every lookup is now one decorator with one rule. `@onEvent`, `@bindTo` and `getRef` keep their `{ ref }` and `{ selector }` spelling.

**Breaking:** move each use as follows, with no field renames. Pass the name to `@ref` when it differs from the field name as an attribute name (`menubarRoot` finds `menubar-root`).

| Before                                            | After                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `@query({ ref: 'x' }) x`                          | `@ref() x`, or `@ref('x') xTarget`                                                             |
| `@query({ ref: 'x', all: true }) xs`              | `@refAll('x') xs`                                                                              |
| `@query({ selector: 's' }) f`                     | `@query('s') f`                                                                                |
| `@query({ selector: 's', all: true }) fs`         | `@queryAll('s') fs`                                                                            |
| `createQuery(host, { ref: 'x' })`                 | `getRef('x')` on the host, or `createQuery(host, '[data-ref="x"]')` to reach into nested hosts |
| `createQuery(host, { selector: 's', all: true })` | `createQueryAll(host, 's')`                                                                    |
| `cache: true`                                     | remove it: read the field once into a local when you need a stable node                        |
