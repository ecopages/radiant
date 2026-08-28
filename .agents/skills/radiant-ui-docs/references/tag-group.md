# Worked example: Tag Group

Source of truth: `packages/radiant-ui/src/components/ui/tag-group/`. This is the filled contract a smaller model should copy structurally — not the only component that needs it.

## Host shape

View-owned Shell. No CE `render()`. Authored children stay in parent JSX. `setItems()` is a Derived Tree escape hatch.

## Selectors extracted from the script

| Selector                  | Kind                           | Host writes                                                            | Author owns                                            |
| ------------------------- | ------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| `[data-tag-list]`         | required list                  | `id`, `role="list"`, `aria-label`, `aria-disabled`                     | the node                                               |
| `[data-tag]`              | required items inside the list | `id` if missing, `role="listitem"`, `aria-selected`, roving `tabIndex` | `data-value`, `data-label`, `hidden`, `aria-disabled`  |
| `[data-value]`            | per tag                        | —                                                                      | identity; fallback trimmed `textContent`               |
| `[data-label]`            | per tag                        | —                                                                      | remove accessible name; fallback trimmed `textContent` |
| `[data-tag-remove]`       | optional, inside a tag         | `type="button"`, `tabIndex=-1`, `aria-label="Remove {label}"`          | presence                                               |
| `[data-ref="root"]`       | optional wrapper               | —                                                                      | required for `setItems()` only                         |
| `[data-rui-managed-list]` | private                        | entire managed list                                                    | do not author; `setItems` creates it                   |

Events: click/keydown on `[data-tag]`, click on `[data-tag-remove]`. Keyboard: Enter/Space select (unless `embedded`), Backspace/Delete remove when a remove control exists, horizontal roving tabindex.

Public methods: `resync()`, `setItems(items)`.

Nested hosts: none. Parents (`rui-select`) query `rui-tag-group` by tag name.

## Helper map

| Export         | Stamps                                   | Caveat                                       |
| -------------- | ---------------------------------------- | -------------------------------------------- |
| `RuiTagGroup`  | host + `[data-ref="root"]` shell         | `tags` convenience API; otherwise `children` |
| `RuiTagList`   | `[data-tag-list]`                        | class `rui-tag-group__list`                  |
| `RuiTag`       | `[data-tag]`, `data-value`, `data-label` | **always** appends `RuiTagRemove`            |
| `RuiTagRemove` | `[data-tag-remove]`                      | class `rui-tag__remove`                      |

BEM classes are presentation-only. The host never queries `.rui-tag`. That is required, not a slogan: if a future change keys off a class, migrate to `data-ref` / `data-*` first (see [query-targets.md](query-targets.md)).

## Bugs this standard exists to catch

The previous MDX Usage snippet was wrong relative to the view:

- `id="react"` on `RuiTag` — the host reads `data-value`, not `id`.
- Nested `<RuiTagRemove />` — `RuiTag` already renders one, so the example doubled the control.

Always diff examples against the helper implementation.

## Minimum headless tree

```html
<rui-tag-group value="react" label="Skills">
	<div data-tag-list>
		<span data-tag data-value="react" data-label="React">
			React
			<button type="button" data-tag-remove></button>
		</span>
	</div>
</rui-tag-group>
```

`data-ref="root"` is not required unless `setItems()` runs. Using the `RuiTagGroup` view always wraps children in that root.
