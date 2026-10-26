# Radiant changeset and release conventions

Repo-specific companion to [SKILL.md](../SKILL.md). Portable mechanics are in [releasing.md](releasing.md); this file covers only what is particular to this repo.

Source of truth: `.changeset/config.json`. While a line is in prerelease, `.changeset/pre.json` holds `mode` and `tag`, and versioned notes live under `.changeset/pre/`.

## Branches

| Branch      | Role                                                                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main`      | GitHub default and production: what is published as `latest`. Release PRs from `next` and hotfix PRs target it. Stable publishes run only from here. |
| `next`      | Integration. Feature and fix PRs target it. `changeset add` and `status` compare against it (`baseBranch`).                                          |
| `release/*` | Active prerelease channel only (see below).                                                                                                          |

A stable cut is a PR from `next` into `main`. A hotfix branches from `main` and targets it; because `baseBranch` is `next`, pick its changeset packages by hand or check them with `changeset status --since=origin/main`.

Versioning happens on `next`, publishing on `main`:

1. Feature and fix PRs target `next`, with a changeset when they change a published package.
2. Every push to `next` opens, or refreshes, the Version Packages PR from `changeset-release/next` into `next`, which collects every pending changeset. An admin merges it when releasing.
3. A release is a PR from `next` into `main`, merged with a merge commit. The push to `main` publishes.
4. A hotfix branches from `main` and targets it, with a changeset. The push to `main` then opens a Version Packages PR from `changeset-release/main` into `main`, and merging it publishes. Afterwards, merge `main` into `next` with a merge commit through a PR, because `main` now holds commits `next` lacks. This is the only case that needs a `main` to `next` merge, and it is manual.

`main` and `next` are protected by a ruleset that requires a PR, one approval and the CI checks, with an admin bypass, so an admin merges these PRs; the workflow's bot has no bypass and never pushes to either branch. `changeset status` needs a local `next`: `git fetch origin next:next`.

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

`.github/workflows/ci.yml` runs on pull requests and on pushes to `main` and `next`. `.github/workflows/close-issues.yml` closes the issues a PR resolves (`Closes #n`) when it merges into `next`, because GitHub only does that for the default branch.

`.github/workflows/release.yml` has two jobs, both running `changesets/action@v2` with `pnpm run version-packages`. `version-packages` runs `changeset version` then `pnpm install --lockfile-only` so workspace `>=` specifiers and `pnpm-lock.yaml` stay in sync on the Version Packages PR. The token is `github-token: ${{ github.token }}`.

- `Version` runs on `next` with no publish script, so it only opens or refreshes the Version Packages PR. A PR opened with `GITHUB_TOKEN` gets its `pull_request` CI run held for approval, so the job then starts `ci.yml` on `changeset-release/next` with `workflow_dispatch` to report the required checks.
- `Release` runs on `main` (and on a `release/*` branch while its trigger is uncommented): `pnpm run build:all`, then the action with `pnpm changeset publish`. With no pending changesets it publishes the versions not yet on npm; with a hotfix changeset it opens a Version Packages PR against `main`, whose CI run an admin approves. Publishing uses OIDC trusted publishing, and provenance is `NPM_CONFIG_PROVENANCE`.

Merge the Version Packages PR on `next` right before opening the release PR. A changeset that reaches `main` unconsumed makes the push to `main` open a Version Packages PR there instead of publishing, and `main` then needs merging back into `next`.

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
