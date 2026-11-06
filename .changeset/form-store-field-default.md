---
'@ecopages/radiant-ui': patch
---

The form store applies one rule for field defaults: `null` and `undefined` both mean "no default" when registering, updating options and resetting.
