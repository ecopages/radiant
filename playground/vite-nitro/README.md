# Radiant Vite Nitro Kitchen Sink

This kitchen sink is the clean full-stack test bed for the JSX work.

It differs from the existing Vite playground in two ways:

- it uses `jsxImportSource: "@ecopages/jsx"` in `tsconfig.json`, so Ecopages JSX is the default runtime for `.tsx` files
- it includes Nitro through the Vite plugin, so client code and server routes can evolve together in one package

This is now the only kitchen sink that contains the JSX-first component experiments. The plain Vite playground has been reduced back to the older client-only Radiant demos so the two sandboxes do not duplicate each other.

Use it to prototype JSX runtime changes, client rendering behavior, and future SSR-related work without carrying over the older alternative JSX setup.

## Resolution Model

The kitchen sink resolves `@ecopages/*` imports through the workspace-linked package dependencies declared in `package.json`.
That keeps Nitro aligned with how an external consumer sees the packages through their export maps instead of forcing local source aliases in Vite.

In local development that means the package `dist` outputs need to exist and stay current.
Use the repo-level Nitro kitchen-sink dev flow so the library watch/build process runs alongside the kitchen-sink server.

## Current Tracking

The current kitchen sink is tracking the merged `RadiantElement` contract and the light-DOM SSR work:

- `render()` returns JSX directly from the web component file
- `update()` is the explicit rerender entrypoint
- `@onUpdated([...])` can decorate `update()` directly to declare rerender dependencies
- `RadiantElement` now owns host-aware SSR through `renderHost()` / `renderHostToString()`
- Nitro can server-render a real custom-element host with light-DOM markup and hydration markers
- the client can hydrate that host markup instead of immediately replacing it
- fragment endpoints now ship normalized render assets with the SSR markup so lazy components can register through Vite and request extra styles when needed
- the kitchen sink now consumes the canonical render result from `@ecopages/radiant/server/render-component`, while Nitro only adapts that metadata into route responses
- the kitchen sink now includes an event policy lab that demonstrates `on:*` auto delegation and the `on-native:*` escape hatch under blocked bubbling

## Current Status

The kitchen sink now first-response SSR renders the page shell through Nitro using the standard `<!--ssr-outlet-->` flow.
That means it demonstrates:

- server rendering of a `RadiantElement` host
- Nitro page-level SSR for the initial document
- light-DOM hydration of that host on the client
- page-level hydration from server HTML on first paint
- on-demand SSR fragment hydration for components that were not in the initial client bundle via a Vite-managed module registry
- opt-in client-only boot for the page shell via the local Radiant Vite integration
- a thin transport adapter where route headers are derived from canonical render metadata instead of a kitchen-sink-specific SSR payload type

## Fragment Transport Contract

Fetched SSR fragments use a small response-header contract so the client does not have to guess how to treat arbitrary HTML.

- `x-radiant-fragment: 1` marks the response as a Radiant-managed fragment payload
- `x-radiant-tag-name` describes the fragment root tag
- `x-radiant-assets` carries the normalized asset list used to activate the fragment
- `x-radiant-client-module` remains as the legacy single-module fallback for older payloads
- `x-generated-at` carries render metadata only

The important split is between ownership and dependencies:

- the fragment header says the client should run the Radiant fragment loading pipeline for this response
- the asset list says which modules, styles, or preload hints are required once that pipeline is active

That avoids brittle checks based on tag names alone. A dashed tag may be a custom element, but that does not mean the response should automatically be treated as a Radiant fragment.

## Controller Activation Model

`RadiantController` fragments do not hydrate through the custom-element path. They activate through the controller registry.

- if a controller module is already present on the page, inserting markup with `data-controller` is enough for the running registry to connect it
- if a fetched fragment introduces a controller that is not loaded yet, the fragment must ship a `script-module` asset for that controller module
- once that module loads and registers the controller, the active registry reconciles the existing DOM and connects the new host

In other words, fragment assets load missing code, while the controller registry is what actually attaches controller behavior to fetched markup.
