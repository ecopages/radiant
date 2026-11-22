---
'@ecopages/radiant-ui': minor
---

`rui-form` can now drive a form state store it did not create, and a host can move focus without a submit.

**New**

- `form.connect(store, { formatError, submitHandler, resetHandler })` injects a `FormStateStore<TIssue>` and is the only way to do so. It returns a disposer that returns the form to its own store in the state it was left: its values, errors, touched fields and submitted flag. `connect` infers `TIssue` from the store, so `formatError(issue, { path })` receives the store's whole entry, with no cast. The `formatError` property applies to the form's own store only.
- The `FormStateStore` contract:
    - `getValue(path)`, `setValue(path, value)` and `blur(path)` take plain arguments; paths are dotted field names.
    - `reportNative(facts)` receives each control's native validity (`NativeValidity`, `{ type, params?, message? }`, with the failing `ValidityState` flag as `type`) keyed by path, `null` for a valid control or one that left the form. The form pushes it right after a user's `setValue`, and through a microtask after a store write, a reset, a rename, a control connecting or one disconnecting (skipped when a live control holds the path, as when rows move). A store binds a fact to the value it holds and never counts a report as a change.
    - `getSnapshot()` returns `{ values, errors, warnings }`, the same object until state changes, and `subscribe(listener)` returns its unsubscribe.
    - `reset()` restores initial values and clears errors, warnings, field state and every fact.
    - `validate()` resolves whether the store holds any error; warnings never count.
- An injected store owns validation timing, touched and dirty state, defaults and which errors and warnings show. The form keeps control registration, the value bridge, native validity, ARIA, presentation, submit and `FormData`, and ignores `mode`, `revalidate-mode`, field `defaultValue`, `defaultValues`, `resolver` and field `rules`.
- `submitHandler({ submitNatively })` takes over submit, and `resetHandler()` takes over the native `reset` event (the form then rewrites the controls from the store). The form emits neither `rui-submit` nor `rui-invalid` for a handled submit, and a rejection is reported with `reportError`.
- `rui-form.sync()` writes the controls the user changed into the store and reports every control's fact. The form calls it before `submitHandler` and before its own validation; call it before validating the store yourself outside submit.
- `rui-form.focusField(paths)` focuses the first registered field among `paths` in document order, with either store. Fields are found from their registrations, so a `RuiField` subclass under another tag counts; unknown paths are ignored.
- `rui-form` copies `action` and `method` onto its inner `<form>` whenever they change, so a native submit follows a later change.
- `snapshot.warnings` and the `RuiFieldWarning` region: a warning never marks the control invalid and never blocks submit.
- A `required` property on `rui-field` is presentation only (`aria-required`, `fieldContext.required`); a `required` rule still validates with the built-in store.
- `announceControlConnect` and `RUI_CONTROL_CONNECT_EVENT` (from `@ecopages/radiant-ui/form`): a control host that appears after its field announces itself with a bubbling `rui-control-connect` event, and the field seeds it from the form.
- `FieldRegistrationHandle` gains `refresh()`, which writes the form's value into the control again and reports its fact, and `FieldRegistration` is exported by name.

**Breaking changes**

- The built-in `FormStore` nests values by dotted path: `profile.name` is `values.profile.name`, and `rows.0.title` is `values.rows[0].title`. `getValues()`, `getSnapshot().values`, `rui-submit` values, `defaultValues`, `defaultValuesData`, rule callbacks and resolvers see the nested tree; HTML `name` attributes and the keys of `errors`, `touched` and `dirty` stay dotted. Migrate: read nested values, or keep flat names without dots.
- `FormContextActions.register` and `FormStore.register` return a handle, `{ rename(name), unregister(), refresh() }`, instead of an unregister function, and `FieldRegistration.element` (the field element) is required. Migrate: `const handle = actions.register(r); handle.unregister()`, and pass the element when you build a registration.
- `FormContextValue.store` is widened from `FormStore` to `FormStateStore`. Migrate: narrow with `instanceof FormStore` to reach `FormStore`-only members.
- An entry in an errors record marks its field invalid even when its `message` is missing or empty, and an error from `FormStore.setErrors` replaces the store's own error at that path (the source set most recently wins, no message is borrowed, and the error clears when the user edits the field). Migrate: give every error a message and expect a source error to take precedence.
- Native `input`, `textarea` and `select` validity (`required`, `type="email"`, `minlength`, `pattern`, ...) now blocks a built-in submit and shows the browser's `validationMessage`; the error `type` is the failing `ValidityState` flag (before, `native`). A `resolver` cannot disable it, and a rule or resolver message replaces its text. Migrate: remove the constraint attributes you do not want enforced.
- `rui-field` `rules` and `default-value`, and `rui-form` `default-values`, `resolver` and `format-error`, are property-only: they are never read from or written to an attribute. Migrate: pass them with `prop:` bindings, and use `data-default-values` / `data-default-value` for defaults in markup.
- Radiant UI form controls dispatch the native `input` and `change` events instead of `rui-change`, and the `Rui*ChangeDetail` types for form controls are removed. Migrate: listen for `input`/`change` and read the value from the control instead of `event.detail`. `rui-checkbox`, `rui-switch`, `rui-radio-group` and `rui-checkbox-group` dispatch nothing themselves; the events of their native inputs bubble through. A host registered with `registerFieldControl` must dispatch `input` (and `change` on commit) on itself after updating `value`. Tabs, tree, treegrid, menus, table, calendar and cycle-toggle keep `rui-change`, meaning a non-form component's selection changed, with the value in `detail`.
- A custom control host must call `announceControlConnect(this)` when it connects: `rui-field` no longer observes its subtree for late controls, and a native `data-rui-control` input, select or textarea must already be inside its field when the field connects. Migrate: call `announceControlConnect` in `connectedCallback`.
- `rui-slider` writes `value` on every move, before it dispatches `input`, and a cancelled drag restores it. A range slider ignores autofill (one string cannot carry both ends) and restores both ends from a saved back/forward state.
- `FormStore` API: `setValue` is a change (it marks the field dirty, validates per `mode` and clears a `setErrors` error at that path) and no longer takes `shouldDirty`; its name is a string path; `errors` is an accessor, so a subclass that declares it as a property no longer compiles; `errors`, `touched` and `dirty` are string-keyed records; `getValues()` returns `FieldValues`; the resolver is `Resolver` (not `Resolver<T>`); and `handleSubmit`'s `onInvalid` receives an optional second argument, the error a validator threw. Migrate: drop `shouldDirty`, and index records with strings.

**Fixes**

- A `rui-field` registers once and keeps that registration across renames and row swaps, instead of unregistering and registering again, which briefly dropped its value.
- A submission always settles: `FormStore.isSubmitting` stays true until an awaited `onSubmit` finishes and is always cleared, a validator that throws ends the submission with `rui-invalid` (`detail.error` holds the thrown value), and an `onSubmit` rejection is reported with `reportError` instead of becoming an unhandled rejection.
- A composite control (a checkbox group, a multi-select) is written once per toggle, from the toggled input's own `change`, and an untouched group writes nothing.
