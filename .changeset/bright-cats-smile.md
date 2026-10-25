---
'@ecopages/radiant-ui': minor
---

Promote the pass-through exports `RuiMeter`, `RuiCalendar`, `RuiToaster`, `RuiToc`, and `RuiTabs` from callable JSX wrappers to their custom-element classes. Each class remains available under its explicit `RuiMeterElement`, `RuiCalendarElement`, `RuiToasterElement`, `RuiTocElement`, or `RuiTabsElement` alias. This is a breaking API change for consumers that called these exports as functions; render them as JSX custom-element classes instead. `RuiToast` and the tab composition helpers remain JSX views.
