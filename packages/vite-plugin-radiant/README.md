# `@ecopages/vite-plugin-radiant`

Drop-in Vite plugin for [Radiant](https://github.com/ecopages/radiant): JSX (`@ecopages/jsx`), SSR externals, element discovery, and client/SSR boot helpers.

## Install

```bash
npm install -D @ecopages/vite-plugin-radiant @ecopages/radiant @ecopages/jsx @ecopages/signals
```

## Quick start

### Client / SPA

```ts
import { defineConfig } from 'vite';
import radiant from '@ecopages/vite-plugin-radiant';

export default defineConfig({
	plugins: [radiant()],
});
```

### Full Radiant app (SSR + element discovery)

```ts
plugins: [...radiant({ elements: true })];
```

### Nitro full-stack

```bash
npm install -D nitro
```

```ts
import { defineConfig } from 'vite';
import { nitro } from 'nitro/vite';
import { defineRadiantNitroConfig, radiantSsr } from '@ecopages/vite-plugin-radiant';

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
| `decorators`      | —                                   | `'babel'` for Rolldown + Babel on Vite 8+                 |
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

### Babel decorators (Vite 8+)

```bash
npm install -D @rolldown/plugin-babel @babel/core @babel/plugin-proposal-decorators
```

```ts
plugins: [radiant({ decorators: 'babel', elements: true })];
```

Vite awaits promises in `plugins` — pass `radiant({ decorators: 'babel' })` as a single entry, do not spread the promise.

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
