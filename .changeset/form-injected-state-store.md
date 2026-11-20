---
'@ecopages/radiant-ui': patch
---

`rui-form` can drive a form state store it did not create. Set the new `store` property to a `FormStateStore` and the form keeps control registration, native validity, ARIA, error presentation, submit and hydration, while the store owns values and errors by dotted path. Without it the form behaves as before. `FormStore` implements `FormStateStore` and gains `getValue`, `getSnapshot`, `validate` and `setErrors`; `FormContextValue.store` is now typed as `FormStateStore`, so reach `FormStore`-only members such as `getValues` with `instanceof FormStore`.
