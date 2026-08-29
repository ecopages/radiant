---
name: radiant-ui-docs
description: >-
    Documents @ecopages/radiant-ui behavior hosts: light-DOM query contracts
    (data-ref / data-* / roles, never BEM), Composition Helpers, TSDoc on rui-*
    custom elements, and apps/radiant-ui MDX. Use when updating component TSDoc,
    authoring or repairing component docs pages, describing data attributes /
    children shape, adding Canvas variants, or applying the tag-group
    documentation standard to another catalog component.
---

# Radiant UI component docs

Radiant UI scripts are **behavior hosts**. They query an already-rendered light-DOM tree. Consumers can:

1. Use the published `Rui*` view and Composition Helpers (recommended).
2. Import the script and pass **any** children that stamp the host's query targets.

The parent custom element's TSDoc is the source of truth for (2). Helpers only stamp that contract. Docs that list JSX names without targets hide half the public API.

Read in this order:

1. [references/query-targets.md](references/query-targets.md) — what hosts may query.
2. [references/contract.md](references/contract.md) — TSDoc and MDX templates.
3. [references/tag-group.md](references/tag-group.md) — filled example.

Catalog terms: `packages/radiant-ui/src/components/ui/README.md`. Docs page mechanics: `apps/radiant-ui/README.md`. Implement or migrate hosts with [radiant-ui-authoring](../radiant-ui-authoring/SKILL.md) **before** documenting.

## When this applies

**Always** for a View-owned Shell whose script uses `querySelector` / `querySelectorAll` / `@onEvent({ selector })` / `@query({ ref })`.

**Skip the light-DOM contract** for Native presentational helpers with no coordinating script (`RuiButton`, `RuiInput`, `RuiChip`, …). For Derived Tree hosts, document `render()` ownership and generated targets; do not tell authors to stamp the inner list.

## Protocol

Work one component at a time. Do not invent targets, roles, or examples.

1. Read `<name>.script.tsx` (or `.ts`). Collect every selector the host actually uses and every attribute it **writes**.
2. If any selector is a **class name**, migrate it to `[data-ref]` (or an existing `data-*` / role) in the script **and** the view that stamps the node. Then collect again. See query-targets.md.
3. Read `<name>.tsx`. Map each public Composition Helper to the target it stamps. Note convenience props (`tags`, `options`) vs `children`.
4. Classify: View-owned Shell, Derived Tree, Nested host.
5. Replace the CE class TSDoc with the template in `references/contract.md`. Describe the **full child tree**.
6. Document each public helper: target stamped, required or not, chrome it always injects.
7. `@cssclass` on the **export that authors the class**, not on the CE, unless CE `render()` paints that class.
8. No `@slot` unless HTML `<slot>` is still the public API.
9. Update `apps/radiant-ui/src/content/components/<slug>.mdx`. Usage matches real helper props. Custom markup matches the script. Extra capabilities get a **Canvas** plus a `docsStory` in `apps/radiant-ui/src/content/stories/<slug>.tsx`.
10. Public methods get a Methods table in MDX and a mention in CE `@remarks`.
11. TSDoc, MDX, and helpers must agree. The script wins; fix the docs.

## Extraction rules (script)

| Source in script                                   | Document as                    |
| -------------------------------------------------- | ------------------------------ |
| `querySelector('[data-foo]')` / `querySelectorAll` | Target `[data-foo]`            |
| `@query({ ref: 'root' })`                          | Target `[data-ref="root"]`     |
| `@onEvent({ selector: '[data-foo]' })`             | Same target; mention the event |
| `[role="option"]` (no data attr)                   | Role is the target             |
| Child tag (`rui-listbox`)                          | Nested host                    |
| Attribute the host **writes**                      | Host-owned                     |
| Attribute the host **reads**                       | Author-owned                   |
| `querySelector('.rui-…')`                          | **Not a target.** Migrate.     |

Ignore private markers (`data-rui-managed-list`, ephemeral ids) unless authors must not collide — then `@remarks` only.

## Voice

- State the contract. Do not substitute “compose with helpers” for listing targets.
- First Usage example: helpers. Custom markup: headless path.
- Consumer MDX: **behavior host**, query contract, targets, Composition Helpers, Authored Children. Never **View-owned Shell**, **Binding**, or **slot** (unless HTML `<slot>` is real).
- No fluff. No emoji.
- If a helper always injects chrome you cannot omit, say so.
- Do not copy a closing line that contradicts the contract list above it.

## MDX pages

Layers stay split: Try it (`Demo`), Usage (hand-maintained tsx), Canvas (extra stories, no controls), Theming, Accessibility, API.

- **Usage** — props that exist on the helper. Do not nest chrome the helper already renders.
- **Custom markup** — import the script; stamp targets. Classes optional, presentation-only. No trailing `;` after JSX.
- **Canvas** — every distinct capability that is easy to miss in the playground (multiple selection, searchable select, range slider, accordion group, alert dialog, …). Export `docsStory` with a unique `parameters.docs.id`.
- **API** — Attributes, Light-DOM contract table, Methods (if any), View helpers with **Target stamped**, CSS classes, events.
- Derived Tree pages skip Custom markup. Say the host `render()`s the inner tree.

## Done when

- [ ] No class selectors in the host script (`querySelector`, `@onEvent`, `@query`).
- [ ] CE TSDoc **Light-DOM contract**: required / per-item / optional targets; host-owned vs author-owned attrs.
- [ ] Minimum headless markup in TSDoc matches the script when the tree is non-obvious.
- [ ] Each public helper names the target it stamps.
- [ ] MDX Usage matches real helper props.
- [ ] MDX Light-DOM contract table (behavior hosts).
- [ ] MDX Custom markup uses targets (behavior hosts only).
- [ ] Public methods in TSDoc and an MDX Methods table.
- [ ] Nested hosts: child element + extra parent selectors; no duplicated child contract.
- [ ] Distinct capabilities have Canvas + `docsStory`.
- [ ] Consumer MDX has no catalog jargon (View-owned Shell, Binding, slot).
