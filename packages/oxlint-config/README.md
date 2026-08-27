# @ecopages/oxlint-config

The workspace-wide Oxlint baseline. Import `@ecopages/oxlint-config/base` from an `oxlint.config.ts` file, extend it, and add only package-specific rules or plugins.

The base configuration limits cyclomatic complexity to 15 and preserves the repository's existing lint policy. Every rule belongs here only when it is valid across all apps, libraries, and playgrounds.
