# Radiant

Radiant is a light-DOM custom-element platform built around visible browser primitives.

Use real custom elements, real DOM events, real attributes, and authored light-DOM children, with `@ecopages/jsx` for TSX rendering and `@ecopages/signals` for renderer-agnostic reactivity.

For more details, [see the docs page](https://radiant.ecopages.app/).

## Packages

- [@ecopages/radiant](./packages/radiant/README.md)
- [@ecopages/jsx](./packages/jsx/README.md)
- [@ecopages/signals](./packages/signals/README.md)

## Release Workflow

This repository releases `@ecopages/radiant`, `@ecopages/jsx`, and `@ecopages/signals` together through Changesets.

The packages are configured as a fixed release group in `.changeset/config.json`, so a coordinated release produces the same version for all three packages.

### Coordinated Alpha Release

Use this flow when you want a public prerelease cycle before publishing the stable version.

```sh
bunx changeset pre enter alpha
bunx changeset version
bun run prerelease
bunx changeset publish --tag alpha
```

On the first prerelease run for a given target version, Changesets will publish that target as `-alpha.0` for every package in the fixed release group. If you run `changeset version` again while prerelease mode is still active, Changesets will increment the prerelease suffix to `alpha.1`, `alpha.2`, and so on.

`@ecopages/jsx` and `@ecopages/signals` do not need a separate manual bootstrap publish just because they have not been published before. Changesets can publish first-time packages in the same coordinated release, as long as npm auth is configured and the packages are published with public access.

Do not pre-bump internal peer dependency ranges before running `changeset version`. Keep them aligned with the currently published internal versions so Changesets can version the fixed release group without dependency-policy errors. After `changeset version`, inspect the generated package manifest changes and confirm the peer ranges are correct for the prerelease being published.

### Stable Release After Alpha

When the alpha cycle is complete, exit prerelease mode and publish the stable release:

```sh
bunx changeset pre exit
bunx changeset version
bun run prerelease
bunx changeset publish
```

### Verify Planned Versions Before Publish

If you want to inspect the version bump before publishing, run:

```sh
bunx changeset pre enter alpha
bunx changeset version
git diff -- packages/*/package.json .changeset
```

That diff will show the exact prerelease versions Changesets plans to publish.

If you run `changeset version` locally, provide a GitHub token because the changelog configuration uses `@changesets/changelog-github`:

```sh
GITHUB_TOKEN="$(gh auth token)" bunx changeset version
```

### Verify Published Dist Tags

After publish, confirm the package versions and dist tags on npm:

```sh
npm view @ecopages/jsx dist-tags versions --json
npm view @ecopages/signals dist-tags versions --json
npm view @ecopages/radiant dist-tags versions --json
```

Consumers testing the prerelease should install the alpha dist tag for all three packages together:

```sh
bun add @ecopages/radiant@alpha @ecopages/jsx@alpha @ecopages/signals@alpha
```
