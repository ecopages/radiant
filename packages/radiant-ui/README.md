# @ecopages/radiant-ui

Accessible light-DOM UI components built with [`@ecopages/radiant`](https://www.npmjs.com/package/@ecopages/radiant) and `@ecopages/jsx`, documented in Storybook.

Custom elements use the **`rui-*`** tag prefix. Public TypeScript / JSX exports use the **`Rui*`** prefix.

This project is **not a React app**. JSX compiles through `@ecopages/jsx`.

## Packages

| Path                                                            | Role                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/components/ui`                                             | **`@ecopages/radiant-ui`** component library (APG-oriented widgets) |
| [`@ecopages/storybook-radiant-vite`](../storybook-radiant-vite) | Storybook framework for Radiant (client + SSR → hydrate)            |
| `src/components/client`, `src/components/ssr`, `src/stories`    | Framework dogfood demos (not the published UI catalog)              |

Framework documentation (API, SSR contract, Vitest, limitations):  
**[../storybook-radiant-vite/README.md](../storybook-radiant-vite/README.md)**

Library overview and conventions: Storybook **Introduction** (`src/Introduction.mdx`).

## Develop

```bash
pnpm install
pnpm run storybook
```

Open the URL Storybook prints (default port `6006`).

Useful scripts:

```bash
pnpm run test          # Vitest browser story tests
pnpm run test:ssr:smoke # PR SSR smoke (6 stories × client/ssr-static/ssr-hydrate)
pnpm run test:ssr       # Full Components/* SSR matrix (nightly)
pnpm run typecheck
pnpm run lint
pnpm run build:lib     # generate exports + build JS/types + compile CSS
```

`test:ssr:smoke` and `test:ssr` spawn Storybook, visit stories in Playwright, and fail on `.radiant-ssr-error` banners or disallowed page errors. Empty mounts fail only for stories listed in `scripts/storybook-ssr-harness.ts` (`expectsMount` / `allowEmptyMount`).

Published CSS under `dist/` is **already compiled** (Tailwind `@apply` resolved). Theme and token values remain CSS custom properties so apps can swap themes at runtime. The package does not minify CSS.

## Using radiant-ui

```ts
import '@ecopages/radiant-ui/themes/default';
import '@ecopages/radiant-ui/styles.css';
import '@ecopages/radiant-ui/disclosure';
import { RuiDisclosure, RuiDisclosureGroup } from '@ecopages/radiant-ui/disclosure';
import { RuiButton } from '@ecopages/radiant-ui/button';
```

Or register every custom element from the root entry (still load theme + styles separately):

```ts
import '@ecopages/radiant-ui/themes/default';
import '@ecopages/radiant-ui/styles.css';
import '@ecopages/radiant-ui';
```

Convenience bundle (default theme + core primitives):

```ts
import '@ecopages/radiant-ui/radiant-ui.css';
```

Design tokens and themes: see [`AGENTS.md`](./AGENTS.md) and [`DESIGN-SYSTEM-PLAN.md`](./DESIGN-SYSTEM-PLAN.md).

## Story map

- **Components/** — `radiant-ui` catalog (`src/components/ui`)
- **Client/** — framework demos ported from Radiant `playground/vite`
- **SSR/** — framework demos ported from Radiant `playground/vite-nitro`
