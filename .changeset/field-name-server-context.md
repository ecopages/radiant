---
'@ecopages/radiant-ui': patch
'@ecopages/radiant': patch
---

Name controls in server markup from the nearest Field during their own server preparation, instead of patching the markup afterwards. A control in a nested Field takes the nearest Field's name, and a Field no longer adopts a control that belongs to a nested Field. Add the `'beforeAuthoredChildren'` phase to `registerSsrPreparationCallback`, which publishes context before a host's Authored Children are built, and export `resolveSsrContextValue` from `@ecopages/radiant/context`. A control registered with `registerFieldControl` that submits natively must now name itself in server markup, as the Field docs describe.
