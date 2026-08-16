# Releasing with changesets

Portable release mechanics for the 3.x CLI. Repo-specific gates, scripts, and CI behavior are in [project.md](project.md) — read it alongside this file.

## Check state before acting

Release behavior depends entirely on prerelease state, so read it first.

```sh
cat .changeset/pre.json    # absent when stable; otherwise "mode" and active "tag"
ls .changeset/*.md         # pending changesets
ls .changeset/pre/         # versioned changesets already in the current prerelease line (v3+)
npm view <pkg> dist-tags --json
```

While in prerelease mode, `pre.json` holds only `mode` and `tag`. Changesets that have already been versioned into the current prerelease line live in `.changeset/pre/` and feed the eventual stable changelog. Never hand-edit package versions to simulate a release.

## The flow

1. Land changes together with their changeset files.
2. Run the repo's verification gate (typecheck, build, test) before versioning.
3. Version: `pnpm changeset version`. This consumes pending `.changeset/*.md`, rewrites versions, and writes CHANGELOGs.
4. Publish: `pnpm changeset publish`. This publishes every package whose version is not yet on the registry, then creates git tags.

Do not commit between steps 3 and 4 — `publish` acts on the versions `version` just wrote.

`pnpm changeset <cmd>` and `pnpm exec changeset <cmd>` are equivalent when the repo defines a `changeset` script. Pick one and stay consistent.

`changeset version` exits with code 1 when there are no unreleased changesets (v3 behavior). CI and scripts must not treat that as an unexpected failure when an empty run is acceptable.

### GITHUB_TOKEN

When `.changeset/config.json` sets the changelog generator to `@changesets/changelog-github`, `version` calls the GitHub API to resolve PR and commit links, and fails without a token:

```sh
GITHUB_TOKEN="$(gh auth token)" pnpm changeset version
```

Repos on the default changelog generator do not need this. With `changesets/action@v2`, pass the token through the `github-token` input, not the `GITHUB_TOKEN` environment variable.

## Prerelease channels

```sh
pnpm changeset pre enter rc    # or alpha / beta
pnpm changeset pre exit        # before going stable, or before switching channel
```

While `mode` is `pre`, `changeset publish` applies the tag from `pre.json` automatically.

Do not pass `--tag` in prerelease mode. Changesets rejects it with `Releasing under custom tag is not allowed in pre mode`.

### Another cut on the same channel

Add a changeset, then version and publish again. A changeset whose only purpose is to trigger a cut is legitimate — give it a summary that still reads sensibly in a changelog, such as "Prepare the next beta release."

### Switching channel

Channels normally progress `alpha` to `beta` to `rc` to stable.

```sh
pnpm changeset pre exit
pnpm changeset pre enter rc
pnpm changeset version
```

Changesets may carry the prerelease counter across the switch, producing `rc.9` straight after `beta.8`. Normalize the first cut on a new channel to `.0` when that matters.

### Going stable

```sh
pnpm changeset pre exit
pnpm changeset version
pnpm changeset publish
```

This publish moves the `latest` dist-tag, which is what an untagged `npm install` resolves to. Treat moving `latest` as a deliberate decision rather than a side effect, and check [project.md](project.md) for whether it is currently pinned to an older line.

## Dist tags

| Tag      | Install                   | Meaning                              |
| -------- | ------------------------- | ------------------------------------ |
| `latest` | `npm install <pkg>`       | Stable default for untagged installs |
| `alpha`  | `npm install <pkg>@alpha` | Early public prerelease              |
| `beta`   | `npm install <pkg>@beta`  | Feature-complete prerelease          |
| `rc`     | `npm install <pkg>@rc`    | Release candidate                    |

## Peer dependency bumps

In v3, updating a peer dependency bumps dependents by `patch`, not `major`. If a dependent is actually incompatible, add an explicit `major` changeset for it.

## First publish of a package

Publish a package that has never been on the registry manually, once. CI publish steps and provenance settings usually assume the package already exists.

1. Build it.
2. Inspect the tarball: `pnpm --filter <pkg> pack`.
3. Dry run: `pnpm --filter <pkg> publish --dry-run --access public`.
4. Publish with the tag for the channel: `pnpm --filter <pkg> publish --access public --tag rc`, or without `--tag` for stable.
5. Confirm the version on the registry, then hand later bumps to changesets.

When a package sets `publishConfig.directory`, publish from that built directory so the published layout matches its normal releases.

## GitHub Actions

Use `changesets/action@v2` with Changesets CLI v3. v1 only works with CLI v2.

Inputs: `version-script`, `publish-script`, `github-token` (not `GITHUB_TOKEN` env). The action needs `contents: write`, `pull-requests: write`, and `id-token: write` for trusted publishing. Checkout with `fetch-depth: 0`.

`publish-script` must be `changeset publish` (or the repo's equivalent). A raw `npm publish` does not write `CHANGESETS_OUTPUT`, so the action skips git tags and GitHub releases.

## Verify afterwards

```sh
npm view <pkg> dist-tags --json
```

Check every package the release was meant to move, not just one.
