# Radiant Vite + Nitro Kitchen Sink

This playground is the full-stack test bed for the current Radiant + Ecopages JSX runtime work.

It exists to prove three things together:

1. Nitro can SSR the initial page shell and individual Radiant fragments.
2. The client can boot from server HTML, lazy-load only the Radiant modules the DOM actually uses, and then hydrate or render the app root.
3. The local Vite plugin can own the discovery and asset-mapping work instead of requiring a hand-maintained import list.

## What This Playground Covers

- `RadiantElement` SSR and hydration
- `RadiantController` activation from plain `data-controller` hosts
- on-demand fragment loading with script and style assets
- client-only page boot through a request-level mode switch
- context, slots, signals, and event-policy demos running under the same app shell

## Resolution Model

The playground resolves `@ecopages/*` packages through the workspace-linked dependencies declared in [package.json](./package.json).

That means local development still depends on the workspace package outputs being current. The only local path alias in [vite.config.ts](./vite.config.ts) is `@ -> src` for playground-internal imports.

## Important Files

- [app/entry-server.tsx](./app/entry-server.tsx) - Nitro page-shell SSR entry. Chooses SSR vs client-only mode and renders the initial shell.

- [vite-plugin-radiant/nitro/index.ts](./vite-plugin-radiant/nitro/index.ts) - Nitro page/document adapter. Handles SSR vs client-only mode negotiation, renders the app shell, and can discover Radiant custom elements plus authored `data-controller` hosts from the final document HTML.

- [vite-plugin-radiant/nitro/render.ts](./vite-plugin-radiant/nitro/render.ts) - Lower-level SSR fragment adapter around `@ecopages/radiant/server/render-component` and `@ecopages/radiant/server/render-controller`. Installs the light-DOM shim and merges resolved fragment assets.

- [vite-plugin-radiant/runtime/start-radiant-app.tsx](./vite-plugin-radiant/runtime/start-radiant-app.tsx) - Plugin-owned client bootstrap. Installs the hydrator by default, scans the DOM for required Radiant modules, mounts the app root, rescans client-only output, then starts controllers.

- [src/main.tsx](./src/main.tsx) - Thin client entrypoint.

- [vite-plugin-radiant/README.md](./vite-plugin-radiant/README.md) - Detailed plugin-specific documentation.

The plugin is now organized directly by concern under `vite-plugin-radiant/plugin/`, `vite-plugin-radiant/runtime/`, and `vite-plugin-radiant/nitro/`.

## Runtime Model

### Initial Page Request

1. Nitro receives the request in [app/entry-server.tsx](./app/entry-server.tsx).
2. The entry delegates SSR vs client-only handling to [vite-plugin-radiant/nitro/index.ts](./vite-plugin-radiant/nitro/index.ts).
3. For SSR mode, the Nitro adapter renders the page-level Radiant fragment through `renderSsrComponent(...)` in [vite-plugin-radiant/nitro/render.ts](./vite-plugin-radiant/nitro/render.ts).
4. The document helper in [vite-plugin-radiant/nitro/index.ts](./vite-plugin-radiant/nitro/index.ts) renders the full app shell, scans the final HTML for custom elements and authored controller hosts, and resolves their client assets through `virtual:radiant/ssr-asset-registry`.
5. The Nitro adapter returns HTML that already contains the initial shell, embedded app state, and a `radiant-document-state` script describing the resolved Radiant surface.

Important: the current document helper discovers usage by parsing the rendered HTML through `document.createElement('template')`. In this playground that works because the normal SSR path already imports [vite-plugin-radiant/nitro/render.ts](./vite-plugin-radiant/nitro/render.ts), which installs Radiant's server light-DOM shim. If you call the document helper standalone in another server entry, install the shim first or you will not have the required DOM globals.

### Client Boot

1. [src/main.tsx](./src/main.tsx) calls `startRadiantApp(...)`.
2. The bootstrap installs the Radiant hydrator by default.
3. The bootstrap consumes the server-emitted document state when present and activates those assets directly; client-only paths still fall back to DOM discovery through `virtual:radiant/dom-module-registry`.
4. The app root hydrates by default, or renders if `hydrate: false` is passed.
5. The bootstrap rescans the mounted root only when it started from a client-only path.
6. Controllers start after those modules are available.

### Fragment Loading

1. A client action fetches a fragment endpoint.
2. The response headers identify whether the payload is a Radiant-managed fragment and which assets it needs.
3. The client loads missing script modules and styles before expecting the fragment to activate.
4. Custom elements upgrade through the browser registry.
5. Controllers connect through the Radiant controller registry once their module registers the identifier.

## Fragment Transport Contract

Fetched SSR fragments use response headers so the client does not have to guess how to treat arbitrary HTML.

- `x-radiant-fragment: 1`
  Marks the response as a Radiant-managed fragment payload.

- `x-radiant-assets`
  Carries the normalized asset list used to activate the fragment.

- `x-generated-at`
  Carries render metadata only.

The split is intentional:

- the fragment header says the client should use the Radiant fragment pipeline
- the asset list says which modules and styles are required for activation

That avoids guessing based on tag names alone.

Note: the playground transport no longer mirrors the older package-level header constants for tag name or client module URL. The adapter now treats `RenderedComponent` metadata as the source of truth and exposes only the fragment marker, the asset list, and the render timestamp over HTTP.

## Controller Activation Model

`RadiantController` fragments do not hydrate through the custom-element path.

- If a controller module is already loaded, inserting markup with `data-controller` is enough for the running registry to connect it.
- If a fragment introduces a controller that is not loaded yet, the fragment must ship a `script-module` asset for that controller module.
- Once that module loads and registers the controller, the active registry reconciles the existing DOM and connects the host.

So fragment assets load missing code, while the controller registry is what actually attaches controller behavior to fetched markup.

## Scope

This playground is intentionally a proving ground, not a framework.

It is here to validate:

- the current Radiant SSR and hydration contracts
- the Vite plugin runtime model
- the fragment asset transport contract
- the ergonomics of a thin client boot API

It is not trying to be a file-router or a full Next-style application layer.
