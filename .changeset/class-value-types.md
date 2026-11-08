---
'@ecopages/jsx': patch
---

The JSX types accept a signal or subscribable in `classes`, matching what the runtime binds. `class` stays a plain string, so a wrapper component can merge the `class` it receives; put a reactive class in `classes`. The docs that showed `class={signal}` now show `classes={signal}`.
