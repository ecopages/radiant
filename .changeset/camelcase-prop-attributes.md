---
'@ecopages/radiant': minor
'@ecopages/radiant-ui': minor
---

**Breaking:** Default camelCase `@prop` attributes to kebab-case (`minWidth` becomes `min-width`) across observed attributes, client updates and SSR. To migrate authored HTML, rename camelCase attributes to kebab-case; JSX property names remain camelCase. An explicit `attribute` option keeps its configured name; use a lowercase value when authoring it in HTML.

Radiant UI hosts follow the same rule: authored HTML such as `<rui-sidebar minWidth="200">` becomes `<rui-sidebar min-width="200">`.
