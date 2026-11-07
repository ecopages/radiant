---
'@ecopages/jsx': patch
---

Fix `prop:` bindings on a custom element that holds a signal child. Mounting each signal child re-applied every `prop:` binding queued so far, before the elements were in the page: on a custom element that was not upgraded yet, the write hid the class setter, so the setter never ran. It also made a list whose rows each hold a signal child quadratic (about 1.2 s of 1.4 s for 10,000 rows). Each binding is now applied once, after the DOM is in place.
