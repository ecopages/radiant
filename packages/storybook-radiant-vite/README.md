# `@ecopages/storybook-radiant-vite`

Storybook **framework** for [`@ecopages/radiant`](https://www.npmjs.com/package/@ecopages/radiant): Vite builder, Radiant JSX renderer, and SSR → hydrate story modes.

This is **not** a React framework. Stories use `@ecopages/jsx` (`jsxImportSource`). The TypeScript option `"jsx": "react-jsx"` is only the compiler’s name for automatic JSX emit — the runtime is `@ecopages/jsx`.

## Install

```bash
npm install -D @ecopages/storybook-radiant-vite @ecopages/vite-plugin-radiant storybook \
  @ecopages/radiant @ecopages/jsx @ecopages/signals
```

Peer ranges: `storybook ^10.5.2`, `@ecopages/jsx`, `@ecopages/radiant`, and `@ecopages/signals` `>=0.3.0-rc.4`, and `vite ^8` (optional).

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

### Framework options

Use `globalStyleModules` when static SSR needs a stylesheet that is not reachable from the
story, view, or element modules. These modules are added to the sandboxed static-preview
iframe only; normal and hydrated previews continue to load their browser styles normally.

```ts
const config: StorybookConfig = {
	framework: {
		name: '@ecopages/storybook-radiant-vite',
		options: {
			globalStyleModules: ['/src/styles/tailwind.css'],
		},
	},
};
```

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
	└─ ssr-static    → POST /__radiant_ssr → sandboxed iframe with markup (no client module)
```

| Layer                      | Package entry              | Runs where                   |
| -------------------------- | -------------------------- | ---------------------------- |
| Framework preset           | `./preset`                 | Node (Storybook server)      |
| Renderer preset            | `./renderer-preset`        | Node → wires browser preview |
| Preview / render           | `entry-preview` (internal) | Browser iframe               |
| Public CSF types + testing | `.`                        | Browser / Vitest             |
| Typed `main` config        | `./node`                   | Node                         |

## Writing stories

### `parameters.radiant` (radiant-ui and other design systems)

Published component packages should stay free of Storybook symbols. Declare SSR linking and component CSS in stories:

```ts
import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RuiAlert as RuiAlertElement } from './alert.script';
import { RuiAlert } from './alert';

const meta = {
	title: 'Components/Alert',
	component: RuiAlert,
	parameters: {
		radiant: { element: RuiAlertElement, cssImports: ['./alert.css'] },
	},
	args: { variant: 'info' },
} satisfies Meta<typeof RuiAlert>;

export default meta;
type Story = StoryObj<typeof meta>;
```

- `parameters.radiant.renderMode` — `client` (default), `ssr-hydrate`, or `ssr-static`.
- `parameters.radiant.element` — optional SSR host. Prefer a custom-element constructor; omit for presentational views. A JSX view function is accepted by the type but only constructors are linked at runtime.
- `parameters.radiant.cssImports` — paths relative to the story file; the Vite stamp transform injects side-effect CSS imports. Source-only, never read at runtime.

Those three are the whole authoring surface. The remaining `radiant` fields (`ssrModule`,
`ssrExport`, `clientModule`, `viewModule`, `viewExport`, `storyModule`, `storyExport`) are
resolved from `meta.component` and its module stamps — declare one only to override that
inference. The SSR error banner names the specific field when resolution fails.

> **Important**
> `radiant` is the framework's contract, and SSR modes cross an HTTP boundary to the Vite
> middleware. Only JSON-serializable data travels — `args`, module paths, export names. There
> is no server-side callback hook, so put host state in `args`.

### Project and addon parameters

`parameters` stays open at the top level — `a11y`, `test`, `chromatic`, `viewport` and any
other addon key type-check as usual. Only `radiant` is closed.

Storybook types its own `Parameters` as `{ [name: string]: any }`, and intersecting that would
collapse `radiant` back to `any` — the index signature wins. The framework widens to an
`unknown` index instead: arbitrary keys still pass, while `parameters.radiant` keeps its real
type. Inside `radiant` there is no index signature, so a key belonging to neither the authoring
nor the derived set is an error under `satisfies`:

```text
error TS2353: Object literal may only specify known properties, and 'dialogStage' does not
exist in type 'RadiantAuthoredParameters & RadiantDerivedParameters'.
```

That is the boundary worth enforcing: the framework reads those fields, and a stray key there
means a story is using `radiant` as a config scratchpad.

**Decorator options do not belong in `parameters` at all.** Write the decorator as a factory
and configure it where it is applied:

```ts
// .storybook/with-stylesheets.ts
import type { Decorator } from '@ecopages/storybook-radiant-vite';

export function withStylesheets(entries: StylesheetEntry[]): Decorator {
	return (Story) => {
		/* ...use `entries` directly... */
		return Story();
	};
}
```

```ts
export const DocsNavigation: Story = {
	decorators: [withStylesheets([docsNavCss])],
};
```

The options are typed at the call site, the decorator needs no cast on `context.parameters`,
and there is nothing to keep in sync between a parameter key and the code that reads it.

**Prefer two decorators over one boolean.** Storybook composes `meta` and story decorators
rather than letting a story replace one, so a `meta`-level decorator plus a per-story override
is not expressible. That pressure is what produces flags like `trigger: false`. Split the
behaviours instead and apply each where it belongs:

```ts
const meta = {
	decorators: [withDialogRegistry], // every story needs the registry
} satisfies Meta<typeof RuiDialog>;

export const Default: Story = {
	decorators: [withDialogTrigger], // only stories that want a trigger
};

export const Registry: Story = {
	render: () => /* renders its own triggers, so no trigger decorator */ null,
};
```

Likewise, if a story wants entirely different content, that belongs in its `render` — not in a
flag that makes a decorator substitute content for a `render: () => null`.

**Always annotate with `satisfies`, never a wrapper function.** `Meta<T>` is a conditional
type, so TypeScript cannot infer `T` from a parameter typed by it — a `defineMeta(meta)`
helper would silently degrade every arg to `any`. `satisfies` contextually types the
literal, so `args`, `argTypes` and `render(args)` are all checked against the component's
real props while `typeof meta` keeps the literal types `StoryObj` needs.

`export default` must also be the plain `meta` identifier: Storybook's CSF indexer
statically analyses the default export and does not accept a call expression.

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

Host SSR needs a Vite-loadable **script module** that exports the element class. When
`meta.component` is a stamped Radiant element or a linked JSX view, the framework infers that
module and its export; set `ssrModule` and `ssrExport` only for an override. Args are applied on
the server as host properties (JSON only — no function hooks).

Pure JSX stories use their stamped CSF story module instead and do not need an element script
module. The server replays the story render function with its resolved args.

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

| Field          | Required     | Notes                                                                                     |
| -------------- | ------------ | ----------------------------------------------------------------------------------------- |
| `renderMode`   | no           | `'client'` \| `'ssr-hydrate'` \| `'ssr-static'` (default `client`)                        |
| `ssrModule`    | no           | Host SSR module; inferred from stamped `meta.component`, or an absolute Vite URL override |
| `ssrExport`    | no           | Named class export; otherwise first export with `@customElement` metadata                 |
| `clientModule` | no           | Module to `import()` after markup inject; defaults to SSR response `clientModuleSrc`      |
| `viewModule`   | no           | View module for authored light-DOM SSR on host stories                                    |
| `viewExport`   | no           | Named view export in `viewModule`                                                         |
| `storyModule`  | auto-stamped | CSF module path; enables JSX story SSR when present                                       |
| `storyExport`  | no           | Story export name (e.g. `Default`)                                                        |

There is **no** `initialize` callback. SSR goes over HTTP; only serializable `args` cross the boundary. Put host state in `args`.

### CSF features replayed during SSR

| Feature                                                      | SSR support                                                                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `meta.render` / story `render` / `component` as JSX function | Yes (`composeStoryRender`)                                                                                               |
| CSF `decorators` that wrap `() => JsxRenderable`             | Yes (reversed apply)                                                                                                     |
| Stage helpers inside `render`                                | Preferred for composition stories                                                                                        |
| `args` via stamped story module                              | Yes                                                                                                                      |
| `parameters.radiant.*`                                       | Yes                                                                                                                      |
| Storybook loaders                                            | No                                                                                                                       |
| Storybook `<Story />` decorators                             | No                                                                                                                       |
| `play` interactions on `ssr-static`                          | Storybook runs them in the browser, but static markup is inside a sandboxed iframe; treat static previews as visual-only |

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
3. Preview packages (`storybook/test` and siblings) are installed on Node `globalThis` so `ssrLoadModule` can evaluate story and shared helper modules with the same real bindings as the iframe. Server SSR evaluates those imports; it does not invoke Storybook `play` functions.
4. For stories declaring `parameters.radiant.element`, the view is server-rendered with CSF args (including JSX children) and injected as `authoredContent`.
5. `@ecopages/*` stay **external** in SSR (via `radiant()`) so ALS / runtime shims are singletons.
6. `renderSsrComponent` produces markup + assets (CSS via `radiant({ elements: true })`).
7. For `ssr-hydrate`, preview inserts markup into its mount root, imports the view/client module, and relies on `install-hydrator`. For `ssr-static`, preview puts markup and its styles in a sandboxed iframe; no client module runs there.

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

## Public entrypoints

| Export                                             | Purpose                                                          |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `@ecopages/storybook-radiant-vite`                 | CSF types, `render` / `renderToCanvas`, portable stories helpers |
| `@ecopages/storybook-radiant-vite/node`            | `StorybookConfig`, `FrameworkOptions`, `defineMain`              |
| `@ecopages/storybook-radiant-vite/preset`          | Framework preset (`core`, `viteFinal`) — resolved by Storybook   |
| `@ecopages/storybook-radiant-vite/renderer-preset` | Renderer preset (`previewAnnotations`) — resolved by Storybook   |
| `@ecopages/storybook-radiant-vite/preview`         | Default `parameters` + toolbar `globalTypes`                     |

The root entry also exports `definePreview`, `defineRadiantComponent`, and `radiantSsr`, plus
the `Meta`, `StoryObj`, `Preview`, renderer, and `parameters.radiant` contract types.

## Known limitations

- **SSR args only** — no server-side function hooks over the middleware.
- **No controller SSR** in the middleware yet.
- **Shadow DOM** hosts cannot use SSR modes (Radiant constraint).
- **Storybook UI still depends on React transitively** (`storybook` → `use-sync-external-store` → `react`, and `@storybook/addon-docs` → `react` / `@mdx-js/react`). That is Storybook’s manager/docs stack. Your stories do **not** import or render through React.
- **Tag collisions** — two modules registering the same custom element tag will conflict if both load in one session.

## Publishing

This package depends on `@ecopages/vite-plugin-radiant` for shared Vite primitives (JSX, decorators, SSR externals). Storybook-only code stays here: CSF types, SSR middleware, script-module stamps, and framework HMR.

It is published from this repo through Changesets. It shares a `fixed` version group with `@ecopages/vite-plugin-radiant`, so a bump to either package bumps both.

## License

MIT
