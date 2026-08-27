# @ecopages/oxlint-config

The workspace-wide Oxlint baseline. Import `@ecopages/oxlint-config/base` from an `oxlint.config.ts` file, extend it, and add only package-specific rules or plugins.

The base configuration starts with a cyclomatic-complexity limit of 50 and preserves the repository's existing lint policy. Lower the limit only in a follow-up that refactors every affected workspace. Every rule belongs here only when it is valid across all apps, libraries, and playgrounds.
