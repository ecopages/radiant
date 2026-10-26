---
'@ecopages/radiant-ui': minor
---

**Breaking:** `RuiMeter`, `RuiCalendar`, `RuiToaster`, `RuiToc` and `RuiTabs` are now their custom-element classes instead of callable JSX wrappers; `RuiMeterElement`, `RuiCalendarElement`, `RuiToasterElement`, `RuiTocElement` and `RuiTabsElement` remain aliases of the same classes. JSX usage such as `<RuiMeter value={40} />` is unchanged; code that called an export as a function, such as `RuiMeter({ value: 40 })`, must render JSX instead. `RuiToast` and the tab helpers (`RuiTabList`, `RuiTab`, `RuiTabPanels`, `RuiTabPanel`) remain JSX views.
