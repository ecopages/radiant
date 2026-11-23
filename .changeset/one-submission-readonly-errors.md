---
'@ecopages/radiant-ui': minor
---

`rui-form` runs one submission at a time, `FormStore.errors` is read-only, and `validate()` resolves an outcome.

**Breaking changes**

- `FormStateStore.validate()` and the built-in `FormStore.validate(paths?)` resolve `{ outcome: 'passed' | 'invalid' | 'overtaken' }` (the exported `FormStateValidateResult`) instead of a boolean. `passed` emits `rui-submit`, `invalid` emits `rui-invalid` with the store's errors, and `overtaken`, a check a newer write superseded, ends the submission without an event so the user submits again. Callers migrate `if (await store.validate())`, which is now always truthy, to `(await store.validate()).outcome === 'passed'`. Implementers return `{ outcome: valid ? 'passed' : 'invalid' }`. A `FormStore.validate(paths)` run that a newer validation of the same path superseded resolves `overtaken`.
- `FormStore.errors` is read-only. Assigning it replaced only the form's own errors, so `store.errors = { ...store.errors }` turned errors added with `setErrors` into permanent ones that survived `setErrors(source, {})`. Write errors with `store.setErrors(source, errors)` and remove them with `setErrors(source, {})` or `clearErrors(path?)`.

**Fixes**

- Without a `submitHandler` (the built-in store, or an injected store without one), the form runs one submission at a time per store. A submit while one is validating or awaiting `onSubmit` is ignored, so a double click no longer validates twice or emits `rui-submit` twice. With a `submitHandler`, every submit still calls the handler, which owns its own busy state.
- A submission ends without `rui-submit`, `rui-invalid` or `onSubmit` when the store resolves `overtaken`, when its store was replaced by `connect` or its disposer before validation settled (it no longer submits the replaced store's values), and when the form is no longer connected when validation settles. A form removed and inserted again in the same task keeps its submission.
- A native `stepMismatch` fact carries `params.step` as a number on number and range inputs, like `min` and `max`, instead of the attribute text. Other input types keep the text.
