---
'@ecopages/radiant-ui': patch
---

`RuiDialogClose` with children renders a normal in-flow ghost `RuiButton` instead of the absolutely positioned corner button, so `<RuiDialogClose>Cancel</RuiDialogClose>` sits in a `RuiDialogActions` row. Without children it is still the corner icon button.
