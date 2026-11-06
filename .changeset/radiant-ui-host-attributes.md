---
'@ecopages/radiant-ui': patch
---

Declare the fixed host roles of `rui-sidebar` (`complementary`) and `rui-toast` (`listitem`) with `hostAttributes`. A `<rui-sidebar>` authored without its view now has its landmark role in server output, and a `role` authored on either host is kept instead of overwritten.
