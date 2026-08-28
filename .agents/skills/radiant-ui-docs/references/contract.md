# Documentation contract

Templates for Radiant UI behavior hosts. Fill from the script; do not paraphrase a helper's name as if it were the contract.

## CE class TSDoc

Place this on the `@customElement` class. Keep CEM tags (`@element`, `@attr`, `@fires`, `@see`). Add the Light-DOM contract in the body so IDE hover shows it.

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
 * Derived Tree / `setItems` / `resync` / helper-always-injects-chrome.
 * BEM classes are presentation-only; behavior keys off the targets above.
 * Point at view `@cssclass` rather than listing classes on the CE.
 */
```

Rules:

- Every target in the comment must appear in the script. Every required selector in the script must appear in the comment.
- The minimum markup example belongs in `@remarks` or immediately after the contract list when the tree is non-obvious (more than two targets). Keep it HTML/`<rui-foo>`, not JSX helpers.
- `@cssclass` stays on the view export that authors the class. Remove stale `@cssclass` from the CE when the class is on an inner view node.
- `@slot` only if the public API is still HTML projection.

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

For behavior hosts, add two API pieces that `alert` (presentational dismiss host) does not need at this depth:

### Usage

First snippet: convenience prop **or** helpers. Props in the snippet must exist on the helper (`value` not `id` unless `id` is real).

Do not nest chrome the helper already renders.

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

```

Classes in that snippet are optional and presentation-only. Do not query BEM class names. If a host currently keys off a class, migrate it to `[data-ref]` rather than documenting the class as a target.

### API: Light-DOM contract table

Place after Attributes (and before or instead of a vague `children` Composition row).

| Target | Required | Host writes | Author owns |
| --- | --- | --- | --- |
| `[data-foo-list]` | yes | `role`, `aria-label` | the element itself |
| `[data-foo]` | yes | `role`, `aria-selected`, `tabIndex` | `data-value`, `data-label`, `hidden` |
| `[data-foo-remove]` | no | `type`, `tabIndex`, `aria-label` | presence / label fallback |

Drop the Composition row that only says `children` with no targets.

### API: View helpers

| Component | Target stamped | Notes |
| --- | --- | --- |
| `RuiFooList` | `[data-foo-list]` | … |
| `RuiFooItem` | `[data-foo]` | Always includes `RuiFooRemove`. |

### API: Methods

Document public methods the script exposes (`setItems`, `resync`, `dismiss`, …). Skip private ones.

## Nested hosts

When the parent script queries a child custom element (`this.querySelector('rui-listbox')`, `tagGroupSelector: '… rui-tag-group'`):

- Name the child **element** in the parent's contract.
- Name extra targets the **parent** reads on that child's tree (for example `[data-select-value] rui-tag-group`).
- Do not duplicate the child's full contract; point at the child page / CE TSDoc.

## Derived Tree hosts

Document that inner DOM is generated from host state. Authored children are not the inner list. If both modes exist (tag-group `setItems` vs authored list), document the switch and any hidden authored node.

## Consumer-facing terms

| Say | Do not say |
| --- | --- |
| behavior host, query contract, targets | shadow parts, slots (unless true) |
| Composition Helpers | slots, render props |
| Authored Children | projected content, light-DOM slot |
| host writes / author owns | "managed internally" with no list |

Internal catalog terms (View-owned Shell, Binding) stay in package READMEs, not in component MDX, unless the page is teaching authoring.
```
