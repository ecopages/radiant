---
'@ecopages/jsx': patch
---

Creating JSX inside a `computed` no longer subscribes it to the signals passed as attributes. jsx read every attribute value to decide whether it was a boolean; it now reads only standard boolean attributes. A computed row list that binds each row's class to a signal no longer re-runs when one row is selected.
