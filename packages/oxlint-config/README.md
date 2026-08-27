# @ecopages/oxlint-config

The workspace-wide Oxlint baseline. Import `@ecopages/oxlint-config/base` from an `oxlint.config.ts` file, extend it, and add only package-specific rules or plugins.

This package is **private** and is never published to npm. `"private": true` makes `pnpm publish` refuse it; Changesets is configured with `privatePackages.version` and `privatePackages.tag` set to `false`, so it is not versioned or tagged either. The `0.0.0` version exists only so `pnpm publish` can rewrite `workspace:*` when a public package lists this as a `devDependency`.

The base configuration limits cyclomatic complexity to 15 and preserves the repository's existing lint policy. Every rule belongs here only when it is valid across all apps, libraries, and playgrounds.
