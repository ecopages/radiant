# @ecopages/oxlint-config

Internal workspace package for the Oxlint baseline. Other workspaces list it as a `workspace:*` `devDependency` and import `@ecopages/oxlint-config/base`, then extend it with package-specific rules or plugins.

This is the same shape as Turborepo's `@repo/eslint-config`: a real package in the workspace graph, not a loose file in `configs/`. Keep it that way so dependents declare the relationship, `pnpm` can link it, and a future task runner can invalidate lint when this package changes.

It is **never published**. `"private": true` makes `pnpm publish` skip it and Changesets skips private packages. `"version": "0.0.0"` is the internal-package convention: it is not a release. `pnpm publish` needs a version so it can rewrite `workspace:*` on public packages that depend on this as a `devDependency`.

The base configuration starts with a cyclomatic-complexity limit of 50 and preserves the repository's existing lint policy. Lower the limit only in a follow-up that refactors every affected workspace. Every rule belongs here only when it is valid across all apps, libraries, and playgrounds.
