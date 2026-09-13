---
'@ecopages/radiant-ui': patch
---

Support customizable indicator position on disclosure triggers and default to chevron-down icon.

**@ecopages/radiant-ui**

- Add `icon` and `iconPosition` (`'start' | 'end'`) props to `RuiDisclosure` when using `trigger`.
- Update `RuiDisclosureIcon` default chevron variant to render `RuiIconChevronDown`.
- Export `RuiDisclosureIconProps`, `RuiDisclosurePanelProps`, `RuiDisclosureTriggerProps`, and `RuiDisclosureViewProps` from `@ecopages/radiant-ui/disclosure`.
