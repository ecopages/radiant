---
'@ecopages/radiant-ui': patch
---

Fix number-field commit on blur and give tag chips an accessible name.

**@ecopages/radiant-ui**

- `rui-number-field`: typed input now commits on blur. The focus/blur listeners were registered through delegation, which cannot observe non-bubbling events, so the committed `value` stayed empty after typing; they now use `focusin` / `focusout`.
- `rui-date-range-picker`: same fix for the start/end input focus and blur handlers.
- `rui-tag-group`: managed and authored tag chips now set `aria-label` from the item label. `listitem` has an author-only accessible name, so chips were unnamed for assistive tech and unreachable via `getByRole('listitem', { name })`.
