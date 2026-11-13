---
'@ecopages/radiant-ui': patch
---

`RuiNumberField` commits a typed `0` on an empty field: it sets `value` and emits `rui-change` instead of redisplaying `0` while `value` stays unset. Focusing and blurring an empty field without typing still commits nothing.
