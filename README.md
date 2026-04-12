# Radiant

Bun Monorepo for Radiant, a minimalist web component library designed for simplicity and flexibility.

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

When publishing prereleases, make sure `@ecopages/radiant` peer dependency ranges accept both the prerelease and the eventual stable versions of `@ecopages/jsx` and `@ecopages/signals`. For example, if the coordinated target version is `0.3.0`, the peer range should start at `>=0.3.0-alpha.0 <1.0.0` rather than `>=0.2.0 <1.0.0`, because standard semver ranges do not include prerelease versions unless the prerelease is named in the range.

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
