---
'@ecopages/radiant': patch
---

`FormAssociatedElement` now implements `formStateRestoreCallback(state, mode)`. Back/forward navigation, session restore and autofill write the state the host saved with `setFormValue(value, state)` back through `restoreFormState()` and sync the submission value again, as form reset already does; a `null` state is ignored. Before, a custom control came back empty after the browser restored its form. A subclass that overrides the callback must call `super.formStateRestoreCallback(state, mode)`, and one whose `formState()` cannot be parsed from an autofilled string overrides it for the `'autocomplete'` mode. The new `FormStateRestoreMode` type names the two modes.
