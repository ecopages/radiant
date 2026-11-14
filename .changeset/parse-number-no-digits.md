---
'@ecopages/radiant-ui': patch
---

`parseNumber` returns `null` for text without a digit, such as `abc`, instead of `0`, so `rui-number-field` keeps its committed value when the typed text is not a number, as a native number input does.
