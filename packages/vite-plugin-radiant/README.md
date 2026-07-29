# `@ecopages/vite-plugin-radiant`

Vite 8 plugin for [Radiant](https://github.com/ecopages/radiant): JSX (`@ecopages/jsx`), SSR externals, element discovery, and client/SSR boot helpers.

**Requirements:** Node.js 18+, Vite 8+. Do not use alongside `@vitejs/plugin-react` or `@vitejs/plugin-react-swc` — use this plugin as your framework Vite integration instead.

## Install

```bash
npm install -D @ecopages/vite-plugin-radiant @ecopages/radiant @ecopages/jsx @ecopages/signals vite@^8
```

## Quick start

### Client / SPA

```ts
import { defineConfig } from 'vite';
import radiant from '@ecopages/vite-plugin-radiant';

export default defineConfig({
	plugins: [...radiant()],
});
```

### Full Radiant app (SSR + element discovery)

```ts
plugins: [...radiant({ elements: true })];
```

`elements: true` (or `radiantSsr()`) is **required** when you import `@ecopages/vite-plugin-radiant/ssr` or `/nitro` helpers that resolve `virtual:radiant/*` asset and component registries.

### Nitro full-stack

```bash
npm install -D nitro
```

```ts
import { defineConfig } from 'vite';
import { nitro } from 'nitro/vite';
import { radiantSsr } from '@ecopages/vite-plugin-radiant';

export default defineConfig({
	plugins: [nitro(), ...radiantSsr()],
});
```

```ts
// nitro.config.ts
import { defineRadiantNitroConfig } from '@ecopages/vite-plugin-radiant/nitro-config';

export default defineRadiantNitroConfig({ serverDir: './server' });
```

`radiantSsr()` is sugar for `radiant({ elements: true, nitro: true })`. You still add `nitro()` yourself — it is Nitro's plugin, not ours.

## `radiant(options?)`

| Option            | Default                             | Effect                                                    |
| ----------------- | ----------------------------------- | --------------------------------------------------------- |
| `elements`        | `false` (`true` when `nitro: true`) | Component scan + virtual registries                       |
| `nitro`           | `false`                             | Nitro `nitro` / `ssr` env externals (use after `nitro()`) |
| `decorators`      | —                                   | `'babel'` = temporary TC39 lowering on Vite 8 ([oxc#9170](https://github.com/oxc-project/oxc/issues/9170)); prefer `experimentalDecorators` otherwise |
| `jsxImportSource` | `@ecopages/jsx`                     | JSX import source                                         |

```ts
radiant({
	elements: {
		componentDirectory: 'src/components',
		include: ['**/*.script.ts', '**/*.script.tsx'],
		styles: '**/*.css',
	},
});
```

Add types for virtual modules:

```ts
/// <reference types="@ecopages/vite-plugin-radiant/client" />
```

### Decorators (Vite 8 / Oxc)

Vite 8 transforms with [Oxc](https://oxc.rs/). Oxc already lowers **legacy** TypeScript decorators (`experimentalDecorators: true`). It does **not** yet lower **TC39** stage-3 decorators — tracked in [oxc#9170](https://github.com/oxc-project/oxc/issues/9170).

Radiant supports both styles. For Vite 8 apps today, prefer legacy TypeScript decorators so you need no extra transform:

```jsonc
// tsconfig.json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"useDefineForClassFields": true
	}
}
```

```ts
plugins: [...radiant({ elements: true })];
```

To keep TC39 / stage-3 decorators on Vite 8 before Oxc lands them, opt into Babel (temporary workaround for [oxc#9170](https://github.com/oxc-project/oxc/issues/9170); remove once Oxc ships ECMA decorator lowering).

Those packages are **optional peer dependencies** of this plugin — they are not installed with `@ecopages/vite-plugin-radiant`. Add them only when you set `decorators: 'babel'`:

```bash
npm install -D @rolldown/plugin-babel @babel/core @babel/plugin-proposal-decorators @babel/plugin-syntax-typescript
```

```ts
plugins: [radiant({ decorators: 'babel', elements: true })];
```

Vite awaits promises in `plugins` — pass `radiant({ decorators: 'babel' })` as a single entry, do not spread the promise.

| Path | When to use |
| --- | --- |
| `experimentalDecorators: true` (default plugin path) | Vite 8 without Babel — recommended until Oxc supports TC39 |
| `decorators: 'babel'` (+ optional peers above) | TC39 stage-3 authoring on Vite 8 — temporary until [oxc#9170](https://github.com/oxc-project/oxc/issues/9170) |
| Vite ≤7 + esbuild | TC39 works via esbuild without this plugin option |

## Dev server HMR

Radiant uses Vite's normal module updates for component logic and styles. Changes that affect **element discovery** (adding/removing component scripts or co-located CSS, or changing `@customElement` / `@controller` metadata) invalidate virtual registries and trigger a **full page reload**.

Custom elements are not redefined in place during dev; Radiant does not provide React Fast Refresh-style state preservation across registry changes.

## Subpath exports

| Export                                       | Purpose                                                  |
| -------------------------------------------- | -------------------------------------------------------- |
| `@ecopages/vite-plugin-radiant`              | `radiant()`, `radiantSsr()`                              |
| `@ecopages/vite-plugin-radiant/nitro-config` | `defineRadiantNitroConfig()`                             |
| `@ecopages/vite-plugin-radiant/runtime`      | `startRadiantApp`, document state, `ensureRadiantAssets` |
| `@ecopages/vite-plugin-radiant/ssr`          | `renderSsrComponent`, fragment responses                 |
| `@ecopages/vite-plugin-radiant/ssr/headers`  | Client-safe fragment transport header constants          |
| `@ecopages/vite-plugin-radiant/nitro`        | `renderRadiantDocument`, `renderRadiantNitroPage`        |
| `@ecopages/vite-plugin-radiant/client`       | Virtual module TypeScript declarations                   |

## Advanced composition

For custom stacks (e.g. Storybook frameworks), compose the primitives:

```ts
import {
	radiant,
	radiantElements,
	radiantNitro,
	createRadiantJsxConfig,
	createRadiantSsrExternalsPlugin,
} from '@ecopages/vite-plugin-radiant';
```

Render helpers:

```ts
import { renderRadiantNitroPage } from '@ecopages/vite-plugin-radiant/nitro';
import { startRadiantApp } from '@ecopages/vite-plugin-radiant/runtime';
import { renderSsrComponentResponse } from '@ecopages/vite-plugin-radiant/ssr';
```
