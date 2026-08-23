# Radiant

Radiant is a light-DOM custom-element platform built around visible browser primitives.

Use real custom elements, real DOM events, real attributes, and authored light-DOM children, with `@ecopages/jsx` for TSX rendering and `@ecopages/signals` for renderer-agnostic reactivity.

For repository language, package boundaries, and shared platform concepts, see [CONTEXT.md](./CONTEXT.md).

For more details, [see the docs page](https://radiant.ecopages.app/).

## Packages

- [@ecopages/radiant](./packages/radiant/README.md)
- [@ecopages/jsx](./packages/jsx/README.md)
- [@ecopages/signals](./packages/signals/README.md)
- [@ecopages/radiant-ui](./packages/radiant-ui/README.md)
- [@ecopages/vite-plugin-radiant](./packages/vite-plugin-radiant/README.md)
- [@ecopages/storybook-radiant-vite](./packages/storybook-radiant-vite/README.md)

The JSX package README is the source of truth for entrypoint boundaries. In particular, [packages/jsx/README.md](./packages/jsx/README.md) documents when to use `@ecopages/jsx/server` directly, including the SSR hydration binding scope helpers intended for framework integrations that compose one page from multiple server renders.

```sh
bun add @ecopages/radiant @ecopages/jsx
```

`@ecopages/signals` installs transitively with `@ecopages/radiant`.

Maintainers: versioning and publishing live in [`.agents/skills/changesets/`](.agents/skills/changesets/SKILL.md).
