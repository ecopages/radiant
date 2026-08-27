---
name: changesets
description: >-
    Create changesets, choose bump types, and write user-facing changelog entries
    in repos managed by changesets. Use when a change affects a published package,
    when adding a changeset, or when writing changelog copy. For versioning,
    prerelease channels, dist-tags, or publishing, read references/releasing.md.
---

# Changesets

[changesets](https://changesets.dev) manages versioning and changelogs for a repo. A changeset is a markdown file in `.changeset/` declaring which packages changed, the bump type for each, and a user-facing message that becomes the CHANGELOG entry.

Add one whenever a change is observable to consumers of a published package.

## Read the repo's rules first

Which packages exist, which are co-versioned, and how releases are cut are per-repo facts. Before writing a changeset:

1. Read [references/project.md](references/project.md). It holds this repo's package tiers, release gate, and CI behavior.
2. Read `.changeset/config.json`. It is the source of truth for `fixed`, `linked`, `ignore`, `access`, and the changelog generator.

Never infer the package layout from directory names, and never restructure packages to achieve co-versioning — `fixed` and `linked` already provide it.

## Confirm the CLI major

Commands and behavior differ between majors, so check before running anything unfamiliar:

```sh
node -e "console.log(require('@changesets/cli/package.json').version)"
```

The commands here target the 3.x line. Repos still on 2.x use `@changesets/cli@maintenance-v2` and [changesets/action@v1](https://github.com/changesets/action/tree/maintenance/v1).

## When to add one

Add a changeset when consumers can observe:

- API, export, or type surface changes
- Behavior, performance, or security changes
- Bug fixes affecting runtime or SSR/hydration
- Peer dependency contract changes

Skip it for docs-only work, internal refactors with no shipped behavior change, and private packages. When a release cut needs a file but no package notes, use `pnpm changeset --empty`.

## Create the file

Write `.changeset/<descriptive-name>.md` directly, with a name that describes the change (`ssr-render-scope-als.md`, not `patch.md`). Never put a new changeset in `.changeset/pre/` — that folder is only for notes already consumed by `changeset version` in the current prerelease line, and CI will treat them as already released. `pnpm changeset` prompts interactively and generates a random name; prefer writing the file when the packages and bump are already known.

```markdown
---
'<package-name>': patch
'<other-package>': patch
---

Short user-facing summary of the change.

**<package-name>**

- Concrete bullet for that package's consumers.

**<other-package>**

- Concrete bullet for that package's consumers.
```

Per-package headings earn their place only when more than one package needs its own notes. A single-package changeset is frontmatter plus a summary.

## Bump type

While a package is pre-1.0, including `alpha`, `beta`, and `rc` prereleases:

| Bump    | Use for                                                |
| ------- | ------------------------------------------------------ |
| `patch` | Fixes and small safe improvements                      |
| `minor` | New capabilities, and breaking changes while still 0.x |
| `major` | Avoid until 1.0 planning                               |

After a stable 1.0, use normal semver and reserve `major` for breaking changes.

Bump types are declared per package. Within a `fixed` group, the highest bump among the listed packages applies to the whole group.

## Write for consumers

The message lands in the CHANGELOG and the GitHub release, so write for someone installing the package, not for someone reviewing the diff.

- Lead with the user-visible outcome.
- Add a usage hint when an option, import path, or rename matters.
- No implementation tour. Avoid "refactored X to Y" unless the rename is itself the consumer-facing change.

Good: Move SSR ambient render state to Node `AsyncLocalStorage` and keep client bundles free of the JSX server entry.

Bad: Refactor ssr-render-scope to use ALS instead of a module stack.

## Before finishing

- [ ] Frontmatter lists only packages that belong in a changelog for this change, and no private or ignored ones
- [ ] Bump type matches the pre-1.0 policy above
- [ ] Summary states the outcome for a consumer
- [ ] Filename describes the change

## Releasing

Versioning, prerelease channels, dist-tags, and publishing are in [references/releasing.md](references/releasing.md). Read it before running any `changeset version`, `changeset pre`, or `changeset publish` command. Repo-specific gates and CI behavior are in [references/project.md](references/project.md).
