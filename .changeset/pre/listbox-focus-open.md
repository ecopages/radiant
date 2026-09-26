---
'@ecopages/radiant-ui': patch
---

`<rui-combobox trigger-kind="focus">` no longer ignores the next focus after it refocuses its own input. Select and combobox now share one focus-open rule: only focus arriving from outside the host opens the listbox.
