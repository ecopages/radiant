---
'@ecopages/radiant-ui': patch
---

Fix `RuiNumberField` changing its value when the locale groups with a dot, as de-DE does. Focusing the input wrote the raw number (`1234.5`), and the blur that followed read it back in the locale as 12345. Focus now shows the number in the locale without grouping (`1234,5`), which reads back to the same number, and text typed into the server-rendered input before the script loads is read as written when it has the raw shape the server wrote (`1234.57`) and in the locale otherwise. The server markup still writes the raw number, so a form posted without JavaScript submits a number the server can parse.
