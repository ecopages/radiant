# Forms and values

## Contents

- Field and form
- Native FormData
- Multi-value `value`
- Custom controls

## Field and form

`RuiField` (`<rui-field>`) connects one composed control to an ancestor `RuiForm` (`<rui-form>`). It discovers the outermost `[data-rui-control]` or known `rui-*` control host; a nested host such as the `rui-listbox` inside `rui-select` is not a field control. Set `name` on the field and it copies the name to the control. `RuiForm` validates through its store and hands every field value to `onSubmit`.

Controls fire a bubbling `rui-change` event when their value changes. Listen for it on the control or an ancestor.

## Native FormData

`new FormData(form)` and native `action` / `method` submission see only listed controls:

- `RuiInput`, `RuiTextarea`, checkbox, switch, radio, checkbox group and radio group submit through their inner native input.
- `rui-date-input`, `rui-number-field`, `rui-slider` and `rui-knob` are form-associated and submit through `name` on the host; a range slider also submits `{name}-max`. `RuiDateField` copies `name` to its nested `rui-date-input`; `RuiDateRangePicker` puts `start-name` / `end-name` on its two inputs.
- `RuiSelect`, `RuiCombobox`, `RuiListbox` and `RuiTagGroup` are store-only: read them from `RuiForm` `onSubmit`, not from `FormData`.

## Multi-value `value`

`rui-select`, `rui-combobox`, `rui-listbox`, `rui-checkbox-group`, `rui-tag-group` and `rui-table` share one protocol:

- HTML attribute: comma-separated tokens (`value="ca,tx"`); an empty selection omits it.
- JS property: always `string[]` (`[]` when empty).
- `Rui*` views: `string | readonly string[] | undefined`; a string is parsed as CSV.
- `rui-change` detail: `{ value: string[] }`.

`rui-slider` is the numeric variant: attribute `50` or `25,75`, property `number[]`, view `number | readonly number[]`, detail `{ value: number[] }`. Two numbers put it in range mode.

## Custom controls

To put a third-party host in a `RuiField`, call `registerFieldControl` from `@ecopages/radiant-ui/form` before the field connects. Registration supplies value access, name wiring and a `submission` policy: `native` (default: the field names the control's native input), `host` (a form-associated host) or `none` (store only). It does not make the host form-associated. For native `FormData`, extend `FormAssociatedElement` from `@ecopages/radiant/form-associated-element`. Fire a bubbling `rui-change` when the value changes.
