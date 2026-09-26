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

Library overview and conventions: Storybook **Introduction** (`src/Introduction.mdx`). Component authoring: [`src/components/ui/README.md`](./src/components/ui/README.md).

## Develop

```bash
pnpm install
pnpm run storybook
```

Open the URL Storybook prints (default port `6006`).

### Checking layout and styles

- **Automated (CI-friendly):** `pnpm run test:storybook` runs each story’s `play` function in a real browser (Vitest + Playwright). Layout helpers live in `.storybook/layout-assertions.ts` (overflow, `--text-control-input` font size, popover viewport bounds) — see `Components/DateRangePicker` → **NarrowLayout**. Input typography uses the `--text-control-input` token in `tokens/typography/default.css` (16px below `640px`, `--text-control` at `sm` and up).
- **Manual:** run `pnpm run storybook` and use the browser’s responsive mode or resize the preview; no third-party visual service required.
- **Pixel snapshots (optional):** Vitest browser mode supports Playwright `toHaveScreenshot()` with baselines committed in the repo if you want image diffs without Chromatic.

Useful scripts:

```bash
pnpm run test            # Vitest (storybook + unit browser projects)
pnpm run test:storybook  # Story interaction/render tests (CI)
pnpm run test:ssr:smoke  # SSR smoke (6 stories × client/ssr-static/ssr-hydrate; runs on PRs)
pnpm run test:ssr        # Full Components/* SSR matrix (run on demand)
pnpm run typecheck
pnpm run lint
pnpm run build:lib       # generate exports + build JS/types + compile CSS
```

`test:storybook` runs stories through the Vitest addon (no Storybook dev server). `test:ssr:smoke` and `test:ssr` spawn Storybook, visit stories in Playwright, and fail on `.radiant-ssr-error` banners or disallowed page errors. For stories expected to mount, the harness waits briefly for content or an SSR error banner before checking the result. Empty mounts fail only for stories listed in `scripts/storybook-ssr-harness.ts` (`expectsMount` / `allowEmptyMount`).

Published CSS under `dist/` is **already compiled** (Tailwind `@apply` resolved). Theme and token values remain CSS custom properties so apps can swap themes at runtime. The package does not minify CSS.

Component entries register their nested custom elements as well as their own host. The package's `sideEffects` list preserves source `*.script.ts` / `*.script.tsx` registration modules during the library build and built `index.js` entries during consumer bundling. Removing those source side effects can leave nested Derived Trees as empty tags during SSR. `build:lib` runs `test:package` against isolated imports of the built date compositions and sidebar trigger to verify registration and server-rendered markup.

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

Design tokens and themes: see [`DESIGN.md`](./DESIGN.md). Agent working rules: [`AGENTS.md`](./AGENTS.md).

## Story map

- **Components/** — `radiant-ui` catalog (`src/components/ui`)
- **Client/** — framework demos ported from Radiant `playground/vite`
- **SSR/** — framework demos ported from Radiant `playground/vite-nitro`
