---
'@ecopages/radiant': patch
---

Export the helper types that method decorator results are made of, so a library that exports a shared method decorator, such as `export const onClick = onEvent({ type: 'click' });`, `export const debounced = debounce(300);` or `export const watch = onUpdated('count');`, compiles with `declaration: true` instead of failing with TS2883 or TS4023. From `@ecopages/radiant`: `Method` and `UpdatedHost`. This is not new in the typing refactor: it failed the same way before it.
