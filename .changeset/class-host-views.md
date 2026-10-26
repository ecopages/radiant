---
'@ecopages/radiant-ui': patch
---

Type each catalog tag from its class: `<rui-alert>` and `<RuiAlertElement>` accept the class's public props (`JSX_PROPS` plus its `HTMLElementTagNameMap` entry), and views render their hosts through those classes, which also registers them.
