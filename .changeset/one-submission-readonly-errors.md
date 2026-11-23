---
'@ecopages/radiant-ui': patch
---

Fix two form defects.

`rui-form` now runs one submission at a time when it owns submission (the built-in store, or an injected store without a `submitHandler`). A submit while one is still validating or awaiting `onSubmit` is ignored, so a double click no longer validates twice or emits `rui-submit` twice. A submission whose store was replaced by `connect`, or removed by its disposer, before validation settled now ends without `rui-submit`, `rui-invalid` or `onSubmit`, instead of submitting the replaced store's values. With a `submitHandler`, every submit still calls the handler, which owns its own busy state.

`FormStore.errors` is now read-only. Assigning it replaced only the form's own errors, so `store.errors = { ...store.errors }` turned errors added with `setErrors` into permanent ones that survived `setErrors(source, {})`. Write errors with `store.setErrors(source, errors)` and remove them with `setErrors(source, {})` or `clearErrors(path?)`.
