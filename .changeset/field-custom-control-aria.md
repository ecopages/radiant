---
'@ecopages/radiant-ui': patch
---

A custom control host now paints its own field ARIA, and `RuiFieldError` can show an error that does not belong to a control.

- `RuiField` no longer writes `id`, `data-rui-field-managed` or `aria-*` onto a host registered with `registerFieldControl` that declares `data-rui-aria-target(s)`. It publishes `labelId`, `describedBy` and `disabled` on `fieldContext` (new fields on `FieldContextValue`), and the host binds them declaratively from `@ecopages/radiant-ui/field`: `{...fieldAria(this.field)}` on the target in a `render()` tree, or `@bindTo(fieldAriaBindings('input'))` on the `@contextSelector` field for authored DOM. A target that renders after the field connected is now labelled, and a host that never rendered its target stays free of ARIA. Catalog hosts and native inputs are unchanged. A third-party host that relied on the field's writes must bind the context; the bound attributes include the target `id` that the label's `htmlFor` points at.
- Migration for a third-party host that paints its own ARIA: the field no longer sets native `disabled` on its target, so bind it yourself (for example `<input disabled={this.field?.disabled} {...fieldAria(this.field)} />`). Painted hosts support a single ARIA target, because `fieldAria` and `fieldAriaBindings` yield one `id`; a host with several targets (`data-rui-aria-targets`) must assign its own ids.
- `RuiFieldError` takes an `error` prop (with `children` as the fallback). It renders that content, is visible while non-empty, works outside `RuiField` and on the server, and carries `data-rui-field-error-controlled` so the enclosing field neither overwrites nor hides it.

`@ecopages/radiant-ui` requires `@ecopages/jsx`, `@ecopages/radiant` and `@ecopages/signals` 0.8.3 or later: the `fieldAria()` spread adds and drops attributes, and only that release keeps the element when bound attributes change (#659, #660). The peer ranges are raised to `>=0.8.3`.
