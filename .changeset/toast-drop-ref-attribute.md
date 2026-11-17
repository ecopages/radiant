---
'@ecopages/radiant-ui': patch
---

Stop `rui-toast` writing a stray `ref="toast"` attribute; its `data-ref="toast"` part is unchanged. `ref` is now a reserved JSX callback prop.
