# Agent instructions

Coding standards for agents. Domain vocabulary: [CONTEXT.md](./CONTEXT.md) for platform work. Architecture: README beside the code you edit.

Package indexes:

- [`packages/radiant/README.md`](./packages/radiant/README.md)
- [`packages/jsx/README.md`](./packages/jsx/README.md) — JSX and SSR entrypoints
- [`packages/radiant-ui/README.md`](./packages/radiant-ui/README.md)

Catalog authoring for `@ecopages/radiant-ui` is in [`packages/radiant-ui/src/components/ui/README.md`](./packages/radiant-ui/src/components/ui/README.md). Do not load CONTEXT.md for catalog-only edits.

When behavior changes, update that folder's README and any parent index that lists it. Use CONTEXT.md terms for platform concepts; use the catalog README terms for view-owned composites.

## Comments

- No inline `//` for non-obvious behavior — document on the declaration with TSDoc.
- TSDoc only when it adds info beyond the name; never restate the method/class/function.
- Use `@remarks` for rationale, edge cases, and workarounds (`@remarks`-only blocks are fine).
- Skip TSDoc on trivial or self-explanatory code.

## Formatting

- Do not hand-fix style or linter formatting; format-on-save handles it.
- Prefer template literals over string concatenation.
- No emoji; use plain text (e.g. `[check]`).

## TypeScript

- Avoid `any`; prefer `unknown`. If `any` is unavoidable, explain in `@remarks`.
- Fix linter issues; do not ignore or suppress without cause.
- Avoid TypeScript hacks and anti-patterns.
