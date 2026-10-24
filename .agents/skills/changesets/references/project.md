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

After every push to `main`, `.github/workflows/sync-next.yml` merges `main` into `next` and starts CI on `next`, so released versions, consumed changesets and hotfixes reach `next` without a sync PR. When the merge conflicts, it opens a PR from `sync/main-into-next` (a copy of `main`) into `next` and fails until that PR merges: resolve the conflict on `sync/main-into-next`, never on `main`, merge the PR with a merge commit (not squash or rebase), then run Sync next again (it has a manual trigger) to pick up pushes to `main` made meanwhile. `changeset status` needs a local `next`: `git fetch origin next:next`.

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

`.github/workflows/release.yml` runs on `main` (and on a `release/*` branch while its trigger is uncommented): install, `pnpm run build:all`, then `changesets/action@v2` with `pnpm run version-packages` and `pnpm changeset publish`. `version-packages` runs `changeset version` then `pnpm install --lockfile-only` so workspace `>=` specifiers and `pnpm-lock.yaml` stay in sync on the Version Packages PR. The token is `github-token: ${{ github.token }}`. Provenance is `NPM_CONFIG_PROVENANCE`.

Pending changesets stay on `next`. Merging `next` into `main` either publishes already-versioned packages or opens a Version Packages PR against `main`; merging that PR publishes.

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
