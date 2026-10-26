---
'@ecopages/radiant': major
---

**Breaking:** Default camelCase `@prop` attributes to kebab-case (`minWidth` becomes `min-width`) across observed attributes, client updates and SSR. To migrate authored HTML, rename camelCase attributes to kebab-case; JSX property names remain camelCase. An explicit `attribute` option keeps its configured name.
