---
'@ecopages/radiant-ui': patch
---

Keep comma-separated HTML `value` attributes on multi-select hosts, and expose the live JS property and `rui-change` detail as arrays.

HTML `value="ca,tx"` is unchanged. JSX may still pass a string. If you read `element.value` or `event.detail.value` as a string, update:

- `select.value === 'cat'` → `select.value[0] === 'cat'` or `select.value.includes('cat')`
- `event.detail.value.split(',')` → `event.detail.value` is already `string[]`
- Slider `value` is `number[]` (`[50]` or `[25, 75]`). Drop `values` / `rangeMin` / `rangeMax` view props; pass `value={[25, 75]}`.
- Form `defaultValues` / `onSubmit` for those fields: prefer arrays (`{ language: ['ts'] }`, `{ volume: [50] }`). Strings and numbers still write because the host coerces them.
