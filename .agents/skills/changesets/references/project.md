# Radiant changeset and release conventions

Repo-specific companion to [SKILL.md](../SKILL.md). Portable mechanics are in [releasing.md](releasing.md); this file covers only what is particular to this repo.

Source of truth: `.changeset/config.json`. While a line is in prerelease, `.changeset/pre.json` holds `mode` and `tag`, and versioned notes live under `.changeset/pre/`.

## Branches

| Branch      | Role                                                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main`      | GitHub default and production: what is published as `latest`. Feature, fix and hotfix PRs target it. `changeset add` and `status` compare against it (`baseBranch`). |
| `release/*` | Active prerelease channel only (see below).                                                                                                                          |

Versioning and publishing both happen on `main`:

1. Feature and fix PRs target `main`, with a changeset when they change a published package.
2. Every push to `main` with pending changesets opens, or refreshes, the Version Packages PR from `changeset-release/main` into `main`. An admin merges it when releasing.
3. The push of that merge finds no pending changesets, so the workflow publishes the versions not yet on npm.

`main` is protected by a ruleset that requires a PR, one approval and the CI checks, with an admin bypass, so an admin merges these PRs; the workflow's bot has no bypass and never pushes to either branch.

A `release/*` branch is only for an active prerelease channel: uncomment it in `.github/workflows/release.yml` (and optionally `ci.yml`) while `pre.json` is in `pre` mode, then comment it again when that line ships.

## Package tiers

| Tier                       | Packages                                                            | Rule                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Platform (`fixed`)         | `@ecopages/jsx`, `@ecopages/signals`, `@ecopages/radiant`           | List only those with a user-visible change. `fixed` bumps all three to the same version regardless.                                |
| Design system (`fixed`)    | `@ecopages/radiant-ui`, `@ecopages/radiant-themes`                  | List when components, tokens, themes, or public exports change. `fixed` bumps both to the same version. Not in the platform group. |
| Vite integration (`fixed`) | `@ecopages/vite-plugin-radiant`, `@ecopages/storybook-radiant-vite` | List when either public API changes. `fixed` bumps both to the same version. Not in the platform group.                            |
| Private                    | `apps/*`, `playground/*`, `@ecopages/oxlint-config`                 | Never list in changesets, never publish. Internal packages stay `"private": true` with `0.0.0` so `workspace:*` can resolve.       |

Below 1.0 a `minor` is the breaking bump. When a changeset removes or renames a published export, list each removed path with its replacement (a table works) in the changeset itself, not in the docs site, and say when a path kept its name but changed meaning.

Do not invent a `packages/core/` layout to co-version the platform trio — `fixed` already does that.

## Gate every release

```sh
pnpm run prerelease   # typecheck + build:all + test:all
```

`build:all` covers all six publishable packages, including `@ecopages/radiant-ui` and `@ecopages/storybook-radiant-vite`.

## Versioning needs a token

`.changeset/config.json` uses `@changesets/changelog-github`, so `version` fails without one:

```sh
GITHUB_TOKEN="$(gh auth token)" pnpm changeset version
```

## CI

`.github/workflows/ci.yml` runs on pull requests and on pushes to `main`.

`.github/workflows/release.yml` runs one job on `main` (and on a `release/*` branch while its trigger is uncommented): `pnpm run build:all`, then `changesets/action@v2` with `pnpm run version-packages` and `pnpm changeset publish`. `version-packages` runs `changeset version` then `pnpm install --lockfile-only` so workspace `>=` specifiers and `pnpm-lock.yaml` stay in sync on the Version Packages PR. With pending changesets the action opens that PR, and a PR opened with `GITHUB_TOKEN` gets its `pull_request` CI run held for approval, so the job then starts `ci.yml` on `changeset-release/main` with `workflow_dispatch` to report the required checks. With no pending changesets it publishes the versions not yet on npm. Publishing uses OIDC trusted publishing, and provenance is `NPM_CONFIG_PROVENANCE`.

## Dist tags

`latest` is the stable default (`npm install <pkg>`). Prerelease lines use the tag in `.changeset/pre.json` (`alpha` / `beta` / `rc`). Moving `latest` is the decision to ship a stable cut from `main`.

## Publish layout

`@ecopages/jsx`, `@ecopages/radiant`, and `@ecopages/signals` set `publishConfig.directory: "dist"`. `@ecopages/radiant-ui`, `@ecopages/vite-plugin-radiant`, and `@ecopages/storybook-radiant-vite` publish from the package root.

## Verify a release

```sh
npm view @ecopages/radiant dist-tags --json
npm view @ecopages/jsx dist-tags --json
npm view @ecopages/signals dist-tags --json
npm view @ecopages/radiant-ui dist-tags --json
npm view @ecopages/vite-plugin-radiant dist-tags --json
npm view @ecopages/storybook-radiant-vite dist-tags --json
```
