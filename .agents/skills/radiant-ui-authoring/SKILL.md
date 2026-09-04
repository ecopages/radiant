---
name: radiant-ui-authoring
description: >-
    Authors and refactors @ecopages/radiant-ui catalog components (rui-* custom
    elements, Rui* views, light-DOM View-owned Shells, Derived Trees, Composition
    Helpers). Use when adding a catalog component, changing host behavior or
    markup, migrating slots/bindings, wiring query targets, or editing files
    under packages/radiant-ui/src/components/ui/.
---

# Radiant UI component authoring

Architecture lives in [`packages/radiant-ui/src/components/ui/README.md`](../../../packages/radiant-ui/src/components/ui/README.md). Tokens and CSS: [`DESIGN.md`](../../../packages/radiant-ui/DESIGN.md). Tiers: `src/Introduction.mdx`. Do **not** load root `CONTEXT.md` for catalog-only work.

Query dialect (scripts **and** docs): [query-targets.md](../radiant-ui-docs/references/query-targets.md). After behavior or markup is correct, document with [radiant-ui-docs](../radiant-ui-docs/SKILL.md).

## When this applies

New or changed files under `packages/radiant-ui/src/components/ui/`. Skip for platform (`packages/radiant`, JSX, SSR) — those use CONTEXT.md.

## Protocol

Work one component at a time. Copy a neighbor of the same **tier** (Native / Composite / Form / Shell), not a random file.

1. **Classify** — Native (thin platform control), Composite (APG host), Form (field/form wiring), Shell (layout coordinator). Read Introduction.mdx before inventing a new category.
2. **Pick a host shape** — default **View-owned Shell** (no CE `render()`, no `Bindings` generic). Use **Derived Tree** (`render()` + optional `this.$`) only when inner DOM is generated from host state (calendar grid, toaster list, TOC, meter). Never CE `render()` + `<slot>` for parent-owned chrome. Copy 1:1 field→DOM writes with `@bindTo`; keep `@onUpdated` for procedures.
3. **Lay out files** — see [references/files.md](references/files.md).
4. **Stamp, then query** — the view (or CE `render()` for Derived Tree) places `data-ref` / `data-*` / roles. The script queries those nodes. Never `querySelector('.rui-…')`. Prefer existing shared controllers (`MenuTreeController`, `ListboxHostController`, `ListboxPopoverBehavior`, `PopoverController`) over a one-off keyboard/popover stack.
5. **Connect** — post-sync work in `onConnected()`, not `connectedCallback` + `queueMicrotask(sync)`. Tear down in `disconnectedCallback` what `onConnected` rebuilds.
6. **Style** — one `<name>.css`; `@reference` the theme entry; semantic tokens only. Do not `import './<name>.css'` from the view. Storybook: `parameters.radiant.cssImports`.
7. **Stories + tests** — `*.stories.tsx` with `parameters.radiant.element`. Tests cover behavior, not BEM as a query contract. Visual asserts on classes are fine.
8. **Public surface** — `index.ts` + package export. Events `rui-*`. Collection item `id` is a semantic key, not a DOM `id`.
9. **Docs** — follow radiant-ui-docs (TSDoc contract, MDX, Canvas for extra capabilities).
10. **Changeset** — if consumers of `@ecopages/radiant-ui` can observe the change.

Update the README beside the code when behavior or ownership changes.

## Invariants (do not violate)

- Authored Children stay in parent JSX. No HTML `<slot>` as the JSX API.
- Bindings (`this.$`) never patch parent-authored light DOM.
- Do not bind `hidden` in the view when the CE toggles it with `@bindTo` / `toggleAttribute`. Reflected `open`: seed SSR with `hidden={open ? undefined : true}` and still sync from the host. Internal open: omit `hidden` in the view.
- Peel view-only props; spread the rest; lock invariants after the spread (`JsxCustomElementAttributes` / `JsxElementProps`). `cx` from `@/lib/cx`. Default accessible names via `withDefaultAriaLabel`.
- Non-obvious view defaults come from a constant **exported by the script** (`CHECKBOX_DEFAULT_VALUE`, …). Do not re-declare the literal in the view.
- Cross-cutting helpers: `@/lib/...`. Same-component and sibling UI: `./` and `../` only. Story-only helpers: `.storybook/` via `@sb/*`, never `src/`.
- Hosts query `data-ref` / `data-*` / roles. Never BEM. `data-ref` values are unique inside **this** host (do not stamp a parent column as `root` when a child already uses `root`).
- `@cssclass` on the export that authors the class. `@slot` / `@csspart` off unless HTML slots / shadow parts are actually the API.

## Reuse before inventing

| Need                                  | Use                                                 |
| ------------------------------------- | --------------------------------------------------- |
| Nested menus                          | `shared/menu-tree.ts`                               |
| Listbox in a popup (select, combobox) | `ListboxPopoverBehavior` + `ListboxHostController`  |
| Portaled overlay                      | `PopoverController`                                 |
| Field label / control protocol        | `shared/field-label.ts`, `form/control-protocol.ts` |
| Comma-separated multi value           | `shared/multi-value.ts`                             |
| Numeric range / slider math           | `shared/numeric-range.ts`                           |
| Generated ARIA ids                    | `@/lib/unique-id` (`uniqueId`)                      |

## Done when

- [ ] Host shape matches the problem (Shell vs Derived Tree).
- [ ] Script has no class selectors.
- [ ] View stamps every required target; optional chrome is omitable.
- [ ] `onConnected` / popup `hidden` / prop peel rules hold.
- [ ] CSS is atomic and token-only for themed values.
- [ ] Stories, tests, `index.ts`, package export.
- [ ] radiant-ui-docs applied if the public contract changed.
- [ ] Changeset if the published package changed.
