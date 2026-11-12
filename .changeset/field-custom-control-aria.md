---
'@ecopages/radiant-ui': minor
---

A custom control host now paints its own field ARIA, and `RuiFieldError` can show an error that does not belong to a control.

- `RuiField` no longer writes `id`, `data-rui-field-managed` or `aria-*` onto a host registered with `registerFieldControl` that declares `data-rui-aria-target(s)`. It publishes `labelId`, `describedBy` and `disabled` on `fieldContext` (new fields on `FieldContextValue`), and the host calls the new `applyFieldAria(this, field)` from `@ecopages/radiant-ui/field` in its `fieldContext` handler and `updated()`. A target that renders after the field connected is now labelled, and a host that never rendered its target stays free of ARIA. Catalog hosts and native inputs are unchanged. A third-party host that relied on the field's writes must call `applyFieldAria`.
- `RuiFieldError` takes an `error` prop (with `children` as the fallback). It renders that content, is visible while non-empty, works outside `RuiField` and on the server, and carries `data-rui-field-error-controlled` so the enclosing field neither overwrites nor hides it.
