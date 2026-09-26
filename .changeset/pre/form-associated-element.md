---
'@ecopages/radiant': minor
---

Add `FormAssociatedElement` for custom elements that list on native `FormData`. Import it from `@ecopages/radiant/form-associated-element`; subclasses supply `formValue()` and `restoreFormState()`, and the base owns `name`, `disabled`, fieldset disability, reset, and `setFormValue()`. An explicit `defaultValue: undefined` on `@prop` stays `undefined` instead of falling back to the type default (`0` for `Number`).
