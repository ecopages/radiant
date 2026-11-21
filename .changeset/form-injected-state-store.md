---
'@ecopages/radiant-ui': minor
---

`rui-form` can drive a form state store it did not create. Set the new `store` property to a `FormStateStore` and the form becomes a control bridge: control changes call `setValue`, blur calls `blur`, and submit writes every control the user changed and then either calls the new `submitHandler({ store, submitNatively })` or awaits `validate()` and emits `rui-submit` or `rui-invalid`. Native control validity is re-read from the controls and sent through `setErrors('native', ...)` on every change, blur and submit. The store owns validation timing, touched and dirty state, defaults and which errors show, so `mode`, `revalidate-mode`, field `defaultValue`, `defaultValues`, `resolver` and field `rules` are ignored while a store is injected. Without `store` the form behaves as before, apart from the breaking changes below.

Breaking changes, and how to migrate:

- The built-in `FormStore` nests values by dotted path: a field named `profile.name` is `values.profile.name`, and `rows.0.title` is `values.rows[0].title`. `getValues()`, `getSnapshot().values`, `rui-submit` values, `defaultValues`, `defaultValuesData`, rule `validate` callbacks and resolvers all see the nested tree. HTML `name` attributes, and the keys of `errors`, `touched` and `dirty`, stay dotted. Before, such a name was one literal flat key. Read nested values, or keep flat names without dots.
- `FormContextActions.register` returns a handle, `{ rename(name), unregister() }`, instead of an unregister function. Replace `const off = actions.register(r); off()` with `const handle = actions.register(r); handle.unregister()`.
- `FormContextValue.store` is widened from `FormStore` to `FormStateStore`. Code that reads `FormStore`-only members such as `getValues()` from the context must narrow with `instanceof FormStore`.
- An entry in an errors record marks its field invalid even when its `message` is missing or empty (before, a rule or resolver error without a message was ignored), and errors from `setErrors` sources merge as `native`, then `validation`, then any other source, so a later source replaces an earlier one. A built-in submit is blocked by an error from any source until it clears.
- `FormStore.errors` is now an accessor, so a subclass that declares `errors` as a property no longer compiles.
- `FormStore.setValue` takes a string path, the typed `errors`, `touched` and `dirty` records are keyed by string paths, and `FormStore.handleSubmit`'s `onInvalid` receives an optional second argument, the error a validator threw.

`FormStore` implements `FormStateStore` and gains `getValue`, `getSnapshot`, `blur`, `validate` and `setErrors`.

Fixes that ship with it. A `rui-field` no longer unregisters and registers again on its first name update, which briefly dropped its value from the built-in store; a real rename goes through the registration handle in one notification, and two keyed rows can swap names without losing a registration. And a submission always settles: `FormStore.isSubmitting` stays true until an awaited `onSubmit` finishes and is always cleared, a validator that throws ends the submission with `rui-invalid` whose `detail.error` holds the thrown value, and an `onSubmit` rejection is reported with `reportError` instead of becoming an unhandled rejection.
