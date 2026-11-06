---
'@ecopages/radiant-ui': patch
---

Dialog: the host `alert` prop now drives `role` (`alertdialog` or `dialog`) and limits the tab loop to the actions, live. `RuiDialogClose` keeps its visible text as its accessible name and applies the `Close` label only to the icon-only button.
