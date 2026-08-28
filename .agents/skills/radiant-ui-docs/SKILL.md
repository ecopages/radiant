---
name: radiant-ui-docs
description: >-
    Documents @ecopages/radiant-ui behavior hosts: light-DOM query contracts,
    Composition Helpers, TSDoc on rui-* custom elements, and apps/radiant-ui MDX.
    Use when updating component TSDoc, authoring or repairing component docs
    pages, describing data attributes / children shape, or applying the tag-group
    documentation standard to another catalog component.
---

# Radiant UI component docs

Radiant UI scripts are **behavior hosts**. They query an already-rendered light-DOM tree. Consumers can:

1. Use the published `Rui*` view and Composition Helpers (recommended).
2. Import the script and pass **any** children that stamp the host's query targets.

The parent custom element's TSDoc is the source of truth for (2). Helpers only stamp that contract. Docs that list JSX names without targets hide half the public API.

Read [references/contract.md](references/contract.md) before editing. Use [references/tag-group.md](references/tag-group.md) as the filled example. Catalog terms: `packages/radiant-ui/src/components/ui/README.md`. Docs page mechanics: `apps/radiant-ui/README.md`.

## When this applies

**Always** for a View-owned Shell whose script uses `querySelector` / `querySelectorAll` / `@onEvent({ selector })` / `@query({ ref })`.

**Skip the light-DOM contract** for Native presentational helpers with no coordinating script (`RuiButton`, `RuiInput`, `RuiChip`, …) and for Derived Tree hosts whose inner DOM is not parent-authored (document `render()` ownership instead).

## Protocol

Work one component at a time. Do not invent targets, roles, or examples.

1. Read `<name>.script.tsx` (or `.ts`). Collect every selector the host actually uses and every attribute it **writes** (`setAttribute`, `toggleAttribute`, `tabIndex`, `id`, `role`).
2. Read `<name>.tsx`. Map each public Composition Helper to the target it stamps. Note convenience props (`tags`, `options`) vs `children`.
3. Classify:
    - **View-owned Shell** — authored children; host queries.
    - **Derived Tree** — host `render()` owns inner DOM.
    - **Nested host** — parent expects child `rui-*` elements (and those children's contracts).
4. Replace the CE class TSDoc with the template in `references/contract.md`. The class comment must describe the **full child tree**, not only attributes on the host.
5. Document each public helper: the target it stamps, whether it is required, and anything it always injects (for example `RuiTag` always appends `RuiTagRemove`).
6. Put `@cssclass` on the **export that authors the class**, not on the CE, unless the CE's own `render()` paints that class.
7. Do not add `@slot` unless HTML `<slot>` is still the public API. Light-DOM targets are not slots.
8. Update `apps/radiant-ui/src/content/components/<slug>.mdx` with the MDX template in `references/contract.md`. Fix any example that does not match the view props (wrong prop names, duplicated chrome the helper already renders).
9. Keep TSDoc, MDX, and helpers aligned. If they disagree, the script wins; fix the docs.

## Extraction rules (script)

Treat these as the public query contract:

| Source in script                                      | Document as                           |
| ----------------------------------------------------- | ------------------------------------- |
| `querySelector('[data-foo]')` / `querySelectorAll`    | Target `[data-foo]`                   |
| `@query({ ref: 'root' })`                             | Target `[data-ref="root"]`            |
| `@onEvent({ selector: '[data-foo]' })`                | Same target; mention the event        |
| `[role="option"]` (no data attr)                      | Role is the target                    |
| Child tag name (`rui-listbox`, `rui-checkbox`)        | Nested host                           |
| Attribute the host **writes**                         | Host-owned; authors must not fight it |
| Attribute the host **reads** (`data-value`, `hidden`) | Author-owned                          |

Do not query BEM class names. Stable regions use `[data-ref="…"]` (or a dedicated `data-*` / role already in the contract). If a script still selects a class, treat that as a bug to migrate, not a public target.

Ignore private implementation markers (`data-rui-managed-list`, ephemeral ids) unless the author must not collide with them — then mention them under `@remarks`.

## Voice

- State the contract. Do not say "you should compose with helpers" as a substitute for listing targets.
- Prefer helpers in the first Usage example; the Custom markup section is the headless path.
- No fluff. No emoji. No `@slot` language for view-owned trees.
- If the API is awkward (helper always injects chrome you cannot omit), say so.

## Done when

- [ ] CE TSDoc includes **Light-DOM contract** with required / per-item / optional targets and host-owned attrs.
- [ ] A minimum working markup example in TSDoc matches the script (copy-paste, no helper names required).
- [ ] Each public helper names the target it stamps.
- [ ] MDX Usage example matches real helper props.
- [ ] MDX has a **Light-DOM contract** table (behavior hosts only).
- [ ] MDX **Custom markup** example imports the script and uses targets, not a fictional API.
- [ ] Public methods (`setItems`, `resync`, `dismiss`, …) appear in TSDoc and MDX when they are part of the consumer API.
- [ ] Nested hosts name the child element and the extra targets the parent queries on it.
