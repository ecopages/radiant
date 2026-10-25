---
'@ecopages/jsx': patch
---

Keyed children keep their nodes when an unkeyed sibling appears or disappears in the same list or fragment, including a keyed group such as `rows.map(...)` beside a conditional item, under `jsx`, `jsxs` and `jsxDEV` alike. In a list that mixes keyed and unkeyed children, a duplicate key now renders once, at its first position, as it does in a keyed list.
