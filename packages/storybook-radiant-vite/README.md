# `@ecopages/storybook-radiant-vite`

Storybook **framework** for [`@ecopages/radiant`](https://www.npmjs.com/package/@ecopages/radiant): Vite builder, Radiant JSX renderer, and SSR → hydrate story modes.

This is **not** a React framework. Stories use `@ecopages/jsx` (`jsxImportSource`). The TypeScript option `"jsx": "react-jsx"` is only the compiler’s name for automatic JSX emit — the runtime is `@ecopages/jsx`.

## Install

```bash
npm install -D @ecopages/storybook-radiant-vite @ecopages/vite-plugin-radiant storybook \
  @ecopages/radiant @ecopages/jsx @ecopages/signals
```

Peer ranges: `storybook ^10.5`, `@ecopages/* >=0.3.0-beta.3 <1.0.0`, `vite ^5 || ^6 || ^7 || ^8` (optional).

## Configure Storybook

### `.storybook/main.ts`

```ts
import type { StorybookConfig } from '@ecopages/storybook-radiant-vite/node';

const config: StorybookConfig = {
	framework: {
		name: '@ecopages/storybook-radiant-vite',
		options: {},
	},
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
	addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
};

export default config;
```

`defineMain(config)` is available as an identity helper if you prefer that style; it does not add runtime behavior.

### TypeScript (required for JSX)

```json
{
	"compilerOptions": {
		"jsx": "react-jsx",
		"jsxImportSource": "@ecopages/jsx",
		"experimentalDecorators": false,
		"useDefineForClassFields": true
	}
}
```

Important: `"jsx": "react-jsx"` does **not** pull in React. Pair it with `"jsxImportSource": "@ecopages/jsx"`.

### `.storybook/preview.ts`

```ts
import type { Preview } from '@ecopages/storybook-radiant-vite';
import '@ecopages/radiant/client/install-hydrator'; // optional if you rely on the framework preview entry

const preview: Preview = {
	parameters: {
		radiant: {
			renderMode: 'client',
		},
	},
};

export default preview;
```

The framework’s renderer preset already loads `install-hydrator` via its entry-preview bundle. Re-importing in your preview is harmless and makes the dependency explicit for Vitest setups.

## Mental model

```
Story CSF
  └─ parameters.radiant.renderMode
        ├─ client        → render() → renderToCanvas mounts JSX / DOM in the iframe
        ├─ ssr-hydrate   → POST /__radiant_ssr → inject markup → import client module → hydrate
        └─ ssr-static    → POST /__radiant_ssr → inject markup only (no client module)
```

| Layer                      | Package entry              | Runs where                   |
| -------------------------- | -------------------------- | ---------------------------- |
| Framework preset           | `./preset`                 | Node (Storybook server)      |
| Renderer preset            | `./renderer-preset`        | Node → wires browser preview |
| Preview / render           | `entry-preview` (internal) | Browser iframe               |
| Public CSF types + testing | `.`                        | Browser / Vitest             |
| Typed `main` config        | `./node`                   | Node                         |

## Writing stories

### `radiantMeta` (radiant-ui and other design systems)

Published component packages should stay free of Storybook symbols. Declare SSR linking and component CSS in stories:

```ts
import { radiantMeta, type StoryObj } from '@ecopages/storybook-radiant-vite';
import { RuiAlert as RuiAlertElement } from './alert.script';
import { RuiAlert } from './alert';

const meta = {
	title: 'Components/Alert',
	component: RuiAlert,
	args: { variant: 'info' },
};

radiantMeta(meta, { element: RuiAlertElement, stylesheets: ['./alert.css'] });

export default meta;
type Story = StoryObj<typeof meta>;
```

- `element` — host `RadiantElement` for SSR / hydration (pass in the second argument; omit for presentational views).
- `stylesheets` — paths relative to the story file (second argument); the Vite stamp transform injects side-effect CSS imports.
- `export default` must be the plain `meta` object — Storybook's CSF indexer does not accept `export default radiantMeta({ ... })`.
- Use `withStylesheets` / `parameters.stylesheets` only for story-scoped extras (docs skins, etc.).

### Client JSX view

```ts
import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RadiantCounter } from '../components/radiant-counter';
import '../components/radiant-counter.script';

const meta = {
	title: 'Client/Counter',
	component: RadiantCounter,
	parameters: { radiant: { renderMode: 'client' } },
	args: { count: 0, label: 'Counter' },
} satisfies Meta<typeof RadiantCounter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

`component` may be:

1. A JSX function `(args) => JsxRenderable`
2. A custom-element tag string (`'radiant-counter'`)
3. A `RadiantElement` subclass (requires `@customElement` metadata)

### SSR hydrate / static

SSR modes require a Vite-loadable **script module** that exports the element class. Args are applied on the server as host properties (JSON only — no function hooks).

```ts
import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import '../components/radiant-counter.script';

const SSR_MODULE = '/src/components/radiant-counter.script.tsx';

const meta = {
  title: 'SSR/Counter',
  component: 'radiant-counter',
  args: { count: 6, label: 'SSR counter' },
  parameters: {
    radiant: {
      renderMode: 'client',
      ssrModule: SSR_MODULE,
      ssrExport: 'RadiantCounter',
    },
  },
  render: (args) => <radiant-counter count={args.count} label={args.label} />,
} satisfies Meta;

export default meta;

export const SsrHydrate: StoryObj<typeof meta> = {
  parameters: {
    radiant: {
      renderMode: 'ssr-hydrate',
      ssrModule: SSR_MODULE,
      ssrExport: 'RadiantCounter',
    },
  },
};

export const SsrStatic: StoryObj<typeof meta> = {
  parameters: {
    radiant: {
      renderMode: 'ssr-static',
      ssrModule: SSR_MODULE,
      ssrExport: 'RadiantCounter',
    },
  },
};
```

### `parameters.radiant` contract

| Field          | Required     | Notes                                                                                |
| -------------- | ------------ | ------------------------------------------------------------------------------------ |
| `renderMode`   | no           | `'client'` \| `'ssr-hydrate'` \| `'ssr-static'` (default `client`)                   |
| `ssrModule`    | for host SSR | Absolute Vite URL, e.g. `/src/components/foo.script.tsx`                             |
| `ssrExport`    | no           | Named class export; otherwise first export with `@customElement` metadata            |
| `clientModule` | no           | Module to `import()` after markup inject; defaults to SSR response `clientModuleSrc` |
| `viewModule`   | no           | View module for authored light-DOM SSR on host stories                               |
| `viewExport`   | no           | Named view export in `viewModule`                                                    |
| `storyModule`  | auto-stamped | CSF module path; enables JSX story SSR when present                                  |
| `storyExport`  | no           | Story export name (e.g. `Default`)                                                   |

There is **no** `initialize` callback. SSR goes over HTTP; only serializable `args` cross the boundary. Put host state in `args`.

### CSF features replayed during SSR

| Feature                                                      | SSR support                        |
| ------------------------------------------------------------ | ---------------------------------- |
| `meta.render` / story `render` / `component` as JSX function | Yes (`composeStoryRender`)         |
| CSF `decorators` that wrap `() => JsxRenderable`             | Yes (reversed apply)               |
| Stage helpers inside `render`                                | Preferred for composition stories  |
| `args` via stamped story module                              | Yes                                |
| `parameters.radiant.*`                                       | Yes                                |
| Storybook loaders                                            | No                                 |
| Storybook `<Story />` decorators                             | No                                 |
| `play` interactions on `ssr-static`                          | No (static preview is markup-only) |

For composed stories (dialog chrome, toast stage, etc.), put layout in `render` helpers rather than Storybook decorators that SSR cannot replay.

### Toolbar override

The framework registers a toolbar global `radiantRenderMode`:

| Value                                   | Effect                              |
| --------------------------------------- | ----------------------------------- |
| `story` (default)                       | Use `parameters.radiant.renderMode` |
| `client` / `ssr-hydrate` / `ssr-static` | Force that mode for all stories     |

## SSR pipeline (what actually runs)

1. Preview calls `POST /__radiant_ssr` with `{ ssrModule, ssrExport?, viewModule?, viewExport?, storyModule?, storyExport?, args, mode }`.
2. Vite middleware loads `@ecopages/vite-plugin-radiant/ssr` (`renderSsrComponent`) and your script/view/story modules.
3. For `radiantMeta` stories with `element`, the view is server-rendered with CSF args (including JSX children) and injected as `authoredContent`.
4. `@ecopages/*` stay **external** in SSR (via `radiant()`) so ALS / runtime shims are singletons.
5. `renderSsrComponent` produces markup + assets (CSS via `radiant({ elements: true })`).
6. Preview sets `canvas.innerHTML = markup`. For `ssr-hydrate`, it imports the view/client module and relies on `install-hydrator`.

Light-DOM only: Radiant SSR throws for `renderRootMode: 'shadow'`.

## Vitest / portable stories

```ts
// .storybook/vitest.setup.ts
import { beforeAll } from 'vitest';
import { setProjectAnnotations } from '@ecopages/storybook-radiant-vite';
import '@ecopages/radiant/client/install-hydrator';
import * as projectAnnotations from './preview';

const annotations = setProjectAnnotations([projectAnnotations]);
beforeAll(annotations.beforeAll);
```

Also exported: `composeStories`, `composeStory`, `render`, `renderToCanvas`.

Note: Storybook’s `compose*` helpers are not fully generic over custom renderers. This package adapts them with boundary casts so CSF types stay usable — treat that as a Storybook limitation, not a type-safe guarantee of every Storybook internal.

Prefer `client` mode in Vitest. SSR modes need the Vite middleware (Storybook dev server).

## Controllers

`RadiantController` hosts (`data-controller`) are not auto-started by the renderer. After mount:

```ts
import { startControllers } from '@ecopages/radiant/controller-registry';

play: async ({ canvasElement }) => {
  startControllers(canvasElement);
},
```

Controller SSR (`renderController`) is not wired in v1 — use client mode for controller demos.

## Package exports

| Export                                             | Purpose                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `@ecopages/storybook-radiant-vite`                 | CSF types, `render` / `renderToCanvas`, portable stories helpers |
| `@ecopages/storybook-radiant-vite/node`            | `StorybookConfig`, `FrameworkOptions`, `defineMain`              |
| `@ecopages/storybook-radiant-vite/preset`          | Framework preset (`core`, `viteFinal`) — resolved by Storybook   |
| `@ecopages/storybook-radiant-vite/renderer-preset` | Renderer preset (`previewAnnotations`) — resolved by Storybook   |
| `@ecopages/storybook-radiant-vite/preview`         | Default `parameters` + toolbar `globalTypes`                     |

## Known limitations

- **SSR args only** — no server-side function hooks over the middleware.
- **No controller SSR** in the middleware yet.
- **Shadow DOM** hosts cannot use SSR modes (Radiant constraint).
- **Storybook UI still depends on React transitively** (`storybook` → `use-sync-external-store` → `react`, and `@storybook/addon-docs` → `react` / `@mdx-js/react`). That is Storybook’s manager/docs stack. Your stories do **not** import or render through React.
- **Tag collisions** — two modules registering the same custom element tag will conflict if both load in one session.

## Extracting / publishing

This package depends on `@ecopages/vite-plugin-radiant` for shared Vite primitives (JSX, decorators, SSR externals). Storybook-only code stays here: CSF types, SSR middleware, script-module stamps, and framework HMR.

To ship:

1. Copy or publish `packages/storybook-radiant-vite/`
2. Resolve peers from npm (`@ecopages/vite-plugin-radiant`, `@ecopages/radiant`, …)
3. `npm publish` (or Changesets)

## License

MIT
