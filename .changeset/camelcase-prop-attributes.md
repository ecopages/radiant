---
'@ecopages/radiant': minor
'@ecopages/radiant-ui': minor
---

**Breaking:** Default camelCase `@prop` attributes to kebab-case (`minWidth` becomes `min-width`) across observed attributes, client updates and SSR. To migrate authored HTML, rename camelCase attributes to kebab-case; JSX property names remain camelCase. Underscores map to hyphens too (`max_width` becomes `max-width`), and `@attr` now collapses runs of underscores the same way (`a__b` becomes `a-b`, was `a--b`). Reflected and server-rendered host attributes use the new names, so update CSS selectors and `getAttribute`/`setAttribute` calls (`[exclusivetoggles]` becomes `[exclusive-toggles]`). An explicit `attribute` option, or `source` on `@attr`, keeps its configured name; choose a lowercase `attribute` value when consumers write it in HTML.

Radiant UI hosts follow the same rule: authored HTML such as `<rui-sidebar minWidth="200">` becomes `<rui-sidebar min-width="200">`.
