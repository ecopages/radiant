---
'@ecopages/radiant-ui': patch
---

`parseNumber` now returns `null` for text that is not a number, such as `abc` or `12abc`, instead of dropping the stray characters and returning `0` or `12`. It ignores only the group separator, currency, percent sign, unit and spaces the formatter itself writes, and reads the locale's own minus sign, so formatted values still parse back. `rui-number-field` keeps its committed value when the typed text is not a number.
