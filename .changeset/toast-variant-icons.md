---
'@ecopages/radiant-ui': patch
---

Toast variants draw real icons instead of letters and a cross: info and warning keep their meaning with a circled `i` and a triangle exclamation, and an error toast uses a circled exclamation, so a failure no longer shows two crosses next to the close button. `@ecopages/radiant-ui/icons` exports `RuiIconAlertCircle`, `RuiIconAlertTriangle` and `RuiIconInfo`.
