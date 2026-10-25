---
'@ecopages/jsx': patch
---

Keyed children keep their nodes when an unkeyed sibling appears or disappears, including a keyed group such as `rows.map(...)` beside a conditional item, in a list or a fragment, under `jsx`, `jsxs` and `jsxDEV` alike. A mapped list now keeps its own range inside its parent instead of being merged into it. `jsxDEV` now passes static children to `jsxs`, so development builds slot children as production builds do. In a list that mixes keyed and unkeyed children, a duplicate key renders once, at its first position, as it does in a keyed list.

**Breaking:** keys now match within one list only. A nested list whose items are all keyed is no longer merged into its parent list, so an item that moves from one mapped group to another, or a group with another group inserted before it, is rebuilt. To keep their nodes, key the groups too: `groups.map((group) => <Fragment key={group.id}>{group.items.map(renderItem)}</Fragment>)`.
