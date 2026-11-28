---
'@ecopages/radiant-ui': patch
'@ecopages/radiant': patch
---

Name controls in server markup from the nearest Field during their own server preparation, instead of patching the markup afterwards. A control in a nested Field takes the nearest Field's name, and a Field no longer adopts a control that belongs to a nested Field. `registerSsrPreparationCallback` and `runSsrPreparationCallbacks` now take a named phase, `'beforeAuthoredChildren'`, `'beforeOnUpdated'` or `'afterOnUpdated'` (the default), instead of a boolean: pass `'beforeOnUpdated'` where you passed `true`. `'beforeAuthoredChildren'` publishes context before a host's Authored Children are built. Export `resolveSsrContextValue` from `@ecopages/radiant/context`. A control registered with `registerFieldControl` that submits natively takes the name through `registerSubmissionForSsr`, exported with `submissionContext` from `@ecopages/radiant-ui/form`. `renderComponent` now runs the `'beforeAuthoredChildren'` callbacks of its host.
