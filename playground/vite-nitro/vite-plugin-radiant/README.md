# Radiant Vite Plugin

Local Vite and Nitro adapter work for wiring Radiant discovery, lazy client activation, SSR asset resolution, and app load-mode negotiation into a Vite + Nitro app.

This still lives inside the Nitro playground rather than a standalone package, and the implementation is split by concern:

- `plugin/`
  Vite-only implementation for virtual modules, shared plugin helpers, and HMR invalidation.

- `runtime/`
  Browser/runtime implementation for `startRadiantApp(...)`, document bootstrap state, and client-side asset activation.

- `nitro/`
  Nitro/server implementation for page/document rendering, fragment responses, and fragment transport.

- top-level `index.ts`
  Vite plugin entrypoint.

## Purpose

The plugin is trying to solve a narrow problem well:

- discover Radiant element and controller modules from the filesystem
- lazy-load only the client modules the current DOM actually needs
- resolve the correct client and style assets for SSR fragments
- let the app choose between SSR and client-only startup at request time

It is not trying to be a router or a framework-level app abstraction.

## Generated Virtual Modules

The plugin scans a component directory, currently defaulting to `src/components/**/*.script.tsx`, and generates these virtual modules:

| Virtual module                               | Purpose                                                                                                | Used by current playground              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `virtual:radiant/client-module-registry`     | Lazy `moduleKey -> import()` registry.                                                                 | Yes                                     |
| `virtual:radiant/dom-module-registry`        | DOM-driven client loader that maps custom element tag names and controller identifiers to module keys. | Yes                                     |
| `virtual:radiant/ssr-client-module-registry` | SSR resolver from component constructor to client module key.                                          | Yes                                     |
| `virtual:radiant/ssr-asset-registry`         | Resolves script and colocated style assets for SSR fragments.                                          | Yes                                     |
| `virtual:radiant/app-load-mode`              | Reads SSR vs client-only mode from request headers and query params.                                   | Yes                                     |
| `virtual:radiant/components`                 | Optional eager side-effect import module for SSR-side registration.                                    | Not used by the current playground path |

That last module still exists as an escape hatch, but the current playground no longer depends on it for normal SSR page rendering.

## Plugin Options

`radiantElements(...)` accepts these options:

| Option                  | Default                   | Meaning                                                  |
| ----------------------- | ------------------------- | -------------------------------------------------------- |
| `componentDirectory`    | `src/components`          | Directory scanned for component entry modules.           |
| `include`               | `**/*.script.tsx`         | Glob relative to `componentDirectory`.                   |
| `defaultAppLoadMode`    | `ssr`                     | Default page boot mode.                                  |
| `appLoadModeHeader`     | `x-radiant-app-load-mode` | Request header that can override the mode.               |
| `clientOnlySearchParam` | `client-only`             | Query param that forces client-only startup when truthy. |

## Typical Setup

In `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { nitro } from 'nitro/vite';
import { radiantElements } from './vite-plugin-radiant';

export default defineConfig({
	plugins: [radiantElements(), nitro()],
});
```

In the Nitro adapter layer:

- use `virtual:radiant/ssr-asset-registry` to resolve fragment assets
- use `virtual:radiant/app-load-mode` to decide SSR vs client-only startup
- use `renderRadiantDocument(...)` when you need one app-level SSR pass that discovers custom elements and authored `data-controller` hosts from the final document HTML
- use `renderRadiantNitroPage(...)` from `./vite-plugin-radiant/nitro/index` for page-shell SSR

Important: `renderRadiantDocument(...)` currently parses HTML through `document.createElement('template')`. If you import `./vite-plugin-radiant/nitro/index` directly in a bare server context, install Radiant's server light-DOM shim first or route through `./vite-plugin-radiant/nitro/render`, which already installs it as a side effect. This is current behavior, not an idealized contract.

In the client entry:

- import `startRadiantApp(...)` from `./vite-plugin-radiant/runtime/index`

## Client Boot Model

The intended client entrypoint is a thin wrapper around `startRadiantApp(...)`.

Example:

```tsx
import { App } from './app';
import { startRadiantApp } from './vite-plugin-radiant/runtime/index';
import './style.css';

await startRadiantApp({ app: () => <App /> });
```

By default `startRadiantApp`:

1. installs the Radiant hydrator
2. consumes the server-emitted document state when SSR already resolved the Radiant surface, otherwise scans the DOM directly
3. hydrates the app root
4. rescans the mounted root only for client-only startup paths
5. starts Radiant controllers

You can disable hydration explicitly:

```ts
await startRadiantApp({
  app: () => <App />,
  hydrate: false,
  installHydrator: false,
});
```

## DOM Metadata Manifest

The plugin extracts two pieces of metadata from each matched component module:

- `@customElement('tag-name')`
- `@controller('identifier')`

This extraction happens through a synthetic query module using `?radiant-dom-metadata`.

Important:

- the original source file contents are not shipped to the browser as text
- the extracted metadata objects are loaded into the browser through `virtual:radiant/dom-module-registry`
- only the minimal manifest data is shipped, not the source itself

That means the browser receives just enough data to build:

- `tagName -> moduleKey`
- `controllerIdentifier -> moduleKey`

and then lazy-loads only the modules the current document actually needs.

### Contract Note

The extraction logic currently looks for literal decorator arguments in source text.

That means these forms are supported reliably:

```ts
@customElement('radiant-counter')
@controller('dashboard-panel')
```

Computed or indirect names are not part of the current contract.

## SSR Model

The current split is intentional:

- `index.ts` is the Vite plugin entrypoint
- `runtime/` is browser-only
- `nitro/render.ts` is the lower-level SSR adapter over `@ecopages/radiant/server/render-component` and `@ecopages/radiant/server/render-controller`
- `nitro/index.ts` is the page/document-level Nitro adapter

SSR no longer needs to eagerly import every component module just to recover client module keys.

The current flow is:

1. the route imports the specific server-renderable constructor it needs
2. `virtual:radiant/ssr-client-module-registry` reads the constructor's custom-element tag metadata
3. that tag is mapped back to a client module key through the same emitted metadata manifest
4. `virtual:radiant/ssr-asset-registry` emits the canonical hydrate asset list

This keeps SSR module-key resolution aligned with the client manifest model instead of scanning an eager import graph of all components.

For full app shells, `renderRadiantDocument(...)` renders the final JSX output first, then discovers every custom element tag and authored `data-controller` host inside that HTML and resolves their script assets through the same server-side registries. `renderRadiantNitroDocument(...)` serializes that result into one `radiant-document-state` script before the app outlet, so `startRadiantApp(...)` can activate the exact server-rendered Radiant surface without repeating the discovery pass on the client.

Document-level discovery is self-contained and does not require a server DOM global. The adapter scans the rendered HTML for custom-element tags and `data-controller` hosts before serializing the `radiant-document-state` payload.

## HMR Behavior

In dev, the plugin invalidates all generated virtual modules whenever a matching component file is added, removed, or hot-updated. That keeps the manifest and asset registries aligned with the filesystem without a manual restart.

## Scope

The intended scope is still narrow:

- automatic Radiant element and controller discovery
- lazy client activation from actual DOM usage
- SSR asset resolution for fragments
- a minimal boot API for Vite + Nitro apps

This plugin is not currently trying to be a file router or a Next-style framework layer.
