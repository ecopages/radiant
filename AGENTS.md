# Agent instructions

Coding standards for agents. Domain vocabulary: [CONTEXT.md](./CONTEXT.md) for platform work. Architecture: README beside the code you edit.

Package indexes:

- [`packages/radiant/README.md`](./packages/radiant/README.md)
- [`packages/jsx/README.md`](./packages/jsx/README.md) — JSX and SSR entrypoints
- [`packages/radiant-ui/README.md`](./packages/radiant-ui/README.md)

Catalog authoring for `@ecopages/radiant-ui` is in [`packages/radiant-ui/src/components/ui/README.md`](./packages/radiant-ui/src/components/ui/README.md). Playbooks: [`.agents/skills/radiant-ui-authoring/`](./.agents/skills/radiant-ui-authoring/SKILL.md) (implement), [`.agents/skills/radiant-ui-docs/`](./.agents/skills/radiant-ui-docs/SKILL.md) (document). Do not load CONTEXT.md for catalog-only edits.

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

## Tracker

GitHub issues on `ecopages/radiant`, from the forms in `.github/ISSUE_TEMPLATE/` and the labels in `.github/labels.yml`. Board: GitHub Project `radiant` (number 1, owner `ecopages`), Status field: `In progress` while building, `In review` when the PR opens, `Done` when it merges. Integration branch: `main`; feature and fix PRs target it, and the Changesets Version Packages PR is the release gate.
