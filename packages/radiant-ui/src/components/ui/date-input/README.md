# Date input

`rui-date-input` is a Derived Tree: the host `render()`s locale-ordered segments and a hidden ISO input.

## Editing and commit

`segments` is the visible draft. `value` and `[data-date-input-hidden]` stay on the last committed `YYYY-MM-DD` until a unit is complete, focus moves to another segment, or the control blurs.

- A nonempty digit buffer on the focused part is still in progress. Do not publish `value` just because the draft happens to parse as a date (day `1` of `2026-08-20` is not `2026-08-01` until the unit finishes or focus leaves).
- Completing a month or day, or entering four year digits, validates the whole draft and commits a changed in-range date once (`rui-change`). An incomplete year (fewer than four digits) is not committed; leaving that year or the control restores the prior value. Moving to another empty unit does not wipe units already entered.
- Arrow increment and backspace replace that buffer explicitly. An assignment to `value` from outside replaces the draft immediately.
- After render, selection may collapse only while that segment is still `document.activeElement`. A stale collapse must not pull focus back from a later segment.
