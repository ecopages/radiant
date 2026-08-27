# @ecopages/oxlint-config

The workspace-wide Oxlint baseline. Import `@ecopages/oxlint-config/base` from an `oxlint.config.ts` file, extend it, and add only package-specific rules or plugins.

This package is **private** and is never published to npm. `"private": true` makes `pnpm publish` refuse it; Changesets is configured with `privatePackages.version` and `privatePackages.tag` set to `false`, so it is not versioned or tagged either. The `0.0.0` version exists only so `pnpm publish` can rewrite `workspace:*` when a public package lists this as a `devDependency`.

The base configuration starts with a cyclomatic-complexity limit of 50 and preserves the repository's existing lint policy. Lower the limit only in a follow-up that refactors every affected workspace. Every rule belongs here only when it is valid across all apps, libraries, and playgrounds.
