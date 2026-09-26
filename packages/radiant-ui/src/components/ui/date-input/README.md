# Date input

`rui-date-input` is a Derived Tree: the host `render()`s locale-ordered segments. Set `name` on the host to submit the committed ISO value like a native `<input type="date">`. An empty named value submits an empty string. Native reset restores the original value and clears an uncommitted segment draft; a nested Date Field or Date Range Picker receives `rui-form-reset` to restore its parent value.

## Editing and commit

`segments` is the visible draft. `value` stays on the last committed `YYYY-MM-DD` until a unit is complete, focus moves to another segment, or the control blurs.

- A nonempty digit buffer on the focused part is still in progress. Do not publish `value` just because the draft happens to parse as a date (day `1` of `2026-08-20` is not `2026-08-01` until the unit finishes or focus leaves).
- Completing a month or day, or entering four year digits, validates the whole draft and commits a changed in-range date once (`rui-change`). An incomplete year (fewer than four digits) is not committed; leaving that year or the control restores the prior value. Moving to another empty unit does not wipe units already entered.
- Arrow increment and backspace replace that buffer explicitly.
- Only an outside assignment to `value` or `locale` replaces the draft. `label`, `min`, `max`, `disabled`, `read-only`, and `name` keep it: `min` / `max` are read when the draft commits. Disabling removes the segment from the tab order, so the browser blurs it and the Blur column below applies.
- After render, selection may collapse only while that segment is still `document.activeElement`. A stale collapse must not pull focus back from a later segment.

`draftStatus()` in `@/lib/intl-date` classifies the draft. The element's `commit(trigger)` acts on it:

| Draft                                        | Edit (digit, backspace, arrow) | Leave (focus moves to another segment) | Blur (focus leaves the control) |
| -------------------------------------------- | ------------------------------ | -------------------------------------- | ------------------------------- |
| Buffer in progress on the focused part       | keep                           | buffer cleared first                   | buffer cleared first            |
| `partial-year`                               | keep                           | restore                                | restore                         |
| `empty`                                      | publish `''`                   | publish `''`                           | publish `''`                    |
| `incomplete` (missing unit, impossible date) | keep                           | keep                                   | restore                         |
| `out-of-range`                               | restore                        | restore                                | restore                         |
| `date`                                       | publish ISO                    | publish ISO                            | publish ISO                     |

Restore rebuilds `segments` from `value`. Publish sets `value` and emits `rui-change` only when the ISO changes; an unchanged value still rebuilds `segments` so the display normalizes (`1` becomes `01`).
