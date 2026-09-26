---
'@ecopages/radiant-ui': patch
---

Keep a partly typed `rui-date-input` date when props other than `value` or `locale` change. Before this fix, setting `label`, `min`, `max`, `disabled`, `read-only`, or `name` mid-entry threw away the typed digits. Add the `--on-focus-ring` color token (Tailwind `on-focus-ring`), paired with `--focus-ring` and defaulting to `--on-primary`, for text on a focus-ring fill.
