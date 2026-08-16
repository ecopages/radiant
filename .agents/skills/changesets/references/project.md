# Radiant changeset and release conventions

Repo-specific companion to the global `changesets` skill. Portable mechanics live in that skill and its `references/releasing.md`; this file covers only what is particular to this repo.

Source of truth: `.changeset/config.json`. Prerelease channel: `.changeset/pre.json` (`mode`, `tag`). Versioned prerelease changesets: `.changeset/pre/`.

## Package tiers

| Tier | Packages | Rule |
| --- | --- | --- |
| Platform (`fixed`) | `@ecopages/jsx`, `@ecopages/signals`, `@ecopages/radiant` | List only those with a user-visible change. `fixed` bumps all three to the same version regardless. |
| Design system | `@ecopages/radiant-ui` | List when components, tokens, themes, or public exports change. Versions independently — never add it to `fixed`. |
| Vite integration | `@ecopages/vite-plugin-radiant` | List for its own public API, Vite, or Nitro contract changes. Not in `fixed`. |
| Ignored tooling | `@ecopages/storybook-radiant-vite` | Never list. Private and in `ignore`. |
| Private | `apps/*`, `playground/*` | Never list, never publish. |

Do not invent a `packages/core/` layout to co-version the platform trio — `fixed` already does that.

## Gate every release

```sh
pnpm run prerelease   # typecheck + build:all + test:all
```

`build:all` covers all five publishable packages, including `@ecopages/radiant-ui`.

## Versioning needs a token

`.changeset/config.json` uses `@changesets/changelog-github`, so `version` fails without one:

```sh
GITHUB_TOKEN="$(gh auth token)" pnpm changeset version
```

## CI uses changesets/action@v2

`.github/workflows/release.yml` runs on `main`: install, `pnpm run build:all`, then `changesets/action@v2` with:

```sh
pnpm changeset version
npm publish --provenance --access public --workspace packages/radiant
```

The token is passed via `github-token: ${{ secrets.CI_GITHUB_TOKEN }}`, not `GITHUB_TOKEN` env.

CI publishes `@ecopages/radiant` and nothing else. `jsx`, `signals`, `radiant-ui`, and `vite-plugin-radiant` are versioned by the action but never published, and need a manual publish until the workflow moves to `pnpm changeset publish`.

## `latest` is pinned

`latest` stays on `0.2.0` until there is an explicit decision to move it. The active line ships under the prerelease tag in `.changeset/pre.json`. Do not run the stable flow without that decision.

## Publish layout

`@ecopages/jsx`, `@ecopages/radiant`, and `@ecopages/signals` set `publishConfig.directory: "dist"`, so a manual publish runs from that built directory. `@ecopages/radiant-ui` and `@ecopages/vite-plugin-radiant` publish from the package root.

## Verify a release

```sh
npm view @ecopages/radiant dist-tags --json
npm view @ecopages/jsx dist-tags --json
npm view @ecopages/signals dist-tags --json
npm view @ecopages/radiant-ui dist-tags --json
npm view @ecopages/vite-plugin-radiant dist-tags --json
```
