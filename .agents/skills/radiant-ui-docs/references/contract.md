# Documentation contract

Templates for Radiant UI behavior hosts. Fill from the script. Query dialect: [query-targets.md](query-targets.md). Do not paraphrase a helper's name as if it were the contract.

## CE class TSDoc

Place this on the `@customElement` class. Keep CEM tags (`@element`, `@attr`, `@fires`, `@see`). Put the Light-DOM contract in the body so IDE hover shows it.

```ts
/**
 * `<rui-foo>` — one-line job of the host (behavior, not chrome).
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiFoo` view helpers which stamp the same targets.
 *
 * Optional: where this host is nested (parent owns value, `embedded`, …).
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-foo-list]` — what it is. Host sets `role="…"`, `aria-*`, …
 * - `[data-foo]` — what it is. Host sets …
 *
 * Per item:
 * - `[data-value]` — identity the host reads. Fallback if any.
 *
 * Optional:
 * - `[data-foo-remove]` — omit to disable that behavior.
 * - `[data-ref="root"]` — only when method X needs it.
 *
 * Do not set `role` / `aria-selected` / `tabIndex` (list the host-owned attrs).
 * Author `hidden` or `aria-disabled="true"` when those are the supported opt-outs.
 *
 * Nested hosts: `rui-bar` (what the parent expects; extra selectors).
 * Write `Nested hosts: none.` when there are no child custom elements.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/…  (or the real reference)
 * @element rui-foo
 * @attr {string} value - …
 * @fires rui-change - …
 *
 * @remarks
 * Minimum tree / `setItems` / `resync` / helper-always-injects-chrome.
 * Query targets are the selectors above. BEM on the view is presentation (`@cssclass`).
 */
```

Rules:

- Every target in the comment must appear in the script. Every required selector in the script must appear in the comment.
- No class selectors in the script. If you find one, migrate it (query-targets.md) then document `data-ref`.
- Minimum markup in `@remarks` when the tree is non-obvious (more than two targets). HTML / `<rui-foo>`, not JSX helpers.
- `@cssclass` on the view export that authors the class. Remove stale `@cssclass` from the CE when the class is on an inner view node.
- `@slot` only if HTML projection is still the public API.
- Do not claim “the host never queries BEM” unless you verified there is no class selector. Host **writes** of BEM (variant classes) belong in Host writes, not as query targets.
- `data-ref` values must be unique inside this host. Do not reuse `root` for a parent column when a nested host already uses `root`.

## Composition Helper TSDoc

```ts
/**
 * What this node is in the tree, and which host target it stamps.
 *
 * @cssclass rui-foo__bar - Presentation class; not a query target.
 *
 * @remarks Always injects `RuiFooRemove`. Omit the helper and stamp `[data-foo]`
 * yourself when you need a node without that chrome.
 */
```

The primary view (`export function RuiFoo`) documents convenience props vs children, and that children are wrapped in the shell the host expects (`data-ref="root"`, …).

## MDX page (`apps/radiant-ui/src/content/components/<slug>.mdx`)

Keep existing layers: Try it, Usage (hand-maintained snippets), Canvas variants, Theming, Accessibility, API.

Consumer copy uses **behavior host**, query contract, targets, Composition Helpers. Do not write View-owned Shell, Binding, or slot.

### Usage

First snippet: convenience prop **or** helpers. Props in the snippet must exist on the helper (`value` not `id` unless `id` is real).

Do not nest chrome the helper already renders.

### Canvas

Add a `docsStory` in `src/content/stories/<slug>.tsx` and `<Canvas of={Story} meta={Meta} />` for each distinct capability (multiple selection, searchable popup, range mode, accordion group, alert dialog, overlay chrome, …). Do not leave those as prose-only when a live preview exists in Storybook.

### Custom markup

After Usage (or after a short pattern section such as Embedded). Only for hosts with a query contract.

````mdx
## Custom markup

`<rui-foo>` coordinates any light-DOM tree that matches its query contract. The
`Rui*` helpers stamp these targets; they are not required.

```tsx
import '@ecopages/radiant-ui/foo';

<rui-foo value="a" label="Example">
	<div data-foo-list>
		<div data-foo data-value="a" data-label="A">
			A
		</div>
	</div>
</rui-foo>;
```
````

Classes in that snippet are optional and presentation-only. Do not query BEM. Do not end the JSX example with `;`.

### API: Light-DOM contract table

Place after Attributes.

| Target              | Required | Host writes                         | Author owns                          |
| ------------------- | -------- | ----------------------------------- | ------------------------------------ |
| `[data-foo-list]`   | yes      | `role`, `aria-label`                | the element itself                   |
| `[data-foo]`        | yes      | `role`, `aria-selected`, `tabIndex` | `data-value`, `data-label`, `hidden` |
| `[data-foo-remove]` | no       | `type`, `tabIndex`, `aria-label`    | presence / label fallback            |

Drop the Composition row that only says `children` with no targets.

### API: View helpers

| Component    | Target stamped    | Notes                           |
| ------------ | ----------------- | ------------------------------- |
| `RuiFooList` | `[data-foo-list]` | …                               |
| `RuiFooItem` | `[data-foo]`      | Always includes `RuiFooRemove`. |

Helpers that are not query targets use `—` in Target stamped and say so in Notes.

### API: Methods

Document public methods (`setItems`, `resync`, `dismiss`, `toggle`, `setOpen`, …) in a Methods table. Skip private ones. Do not bury them as a sentence under the contract table.

## Nested hosts

When the parent script queries a child custom element (`this.querySelector('rui-listbox')`, `tagGroupSelector: '… rui-tag-group'`):

- Name the child **element** in the parent's contract.
- Name extra targets the **parent** reads on that child's tree (for example `[data-select-value] rui-tag-group`).
- Do not duplicate the child's full contract; point at the child page / CE TSDoc.

## Derived Tree hosts

Document that inner DOM is generated from host state. Authored children are not the inner list. If both modes exist (tag-group `setItems` vs authored list), document the switch and any hidden authored node. Generated nodes still use `data-ref` / `data-*` for the host's own queries.

## Consumer-facing terms

| Say                                    | Do not say                                            |
| -------------------------------------- | ----------------------------------------------------- |
| behavior host, query contract, targets | shadow parts, slots (unless HTML `<slot>` is the API) |
| Composition Helpers                    | slots, render props                                   |
| Authored Children                      | projected content, light-DOM slot                     |
| host writes / author owns              | "managed internally" with no list                     |
| `[data-ref="…"]`                       | `.rui-foo__bar` as a query target                     |

Internal catalog terms (View-owned Shell, Binding) stay in package READMEs, not in component MDX, unless the page is teaching authoring.
