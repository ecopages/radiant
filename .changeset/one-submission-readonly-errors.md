---
'@ecopages/radiant-ui': patch
---

Fix two form defects and make `validate()` report an outcome.

`rui-form` now runs one submission at a time when it owns submission (the built-in store, or an injected store without a `submitHandler`). A submit while one is still validating or awaiting `onSubmit` is ignored, so a double click no longer validates twice or emits `rui-submit` twice. A submission whose store was replaced by `connect`, or removed by its disposer, before validation settled now ends without `rui-submit`, `rui-invalid` or `onSubmit`, instead of submitting the replaced store's values. With a `submitHandler`, every submit still calls the handler, which owns its own busy state.

`FormStore.errors` is now read-only. Assigning it replaced only the form's own errors, so `store.errors = { ...store.errors }` turned errors added with `setErrors` into permanent ones that survived `setErrors(source, {})`. Write errors with `store.setErrors(source, errors)` and remove them with `setErrors(source, {})` or `clearErrors(path?)`.

Breaking for custom stores: `FormStateStore.validate()` now resolves `{ outcome: 'passed' | 'invalid' | 'overtaken' }` (the exported `FormStateValidateResult`) instead of a boolean. `passed` emits `rui-submit`, `invalid` emits `rui-invalid` with the store's errors, and `overtaken`, a check a newer write superseded, ends the submission without an event so the user submits again. A store that returns a boolean must return the object. The built-in `FormStore.validate()` resolves the same object.
