# Radiant Vite Nitro Playground

This playground is the clean full-stack test bed for the JSX work.

It differs from the existing Vite playground in two ways:

- it uses `jsxImportSource: "@ecopages/jsx"` in `tsconfig.json`, so Ecopages JSX is the default runtime for `.tsx` files
- it includes Nitro through the Vite plugin, so client code and server routes can evolve together in one package

This is now the only playground that contains the JSX-first component experiments. The plain Vite playground has been reduced back to the older client-only Radiant demos so the two sandboxes do not duplicate each other.

Use it to prototype JSX runtime changes, client rendering behavior, and future SSR-related work without carrying over the older alternative JSX setup.

## Current Tracking

The current playground is tracking the `RadiantComponent` contract and the light-DOM SSR work:

- `render()` returns JSX directly from the web component file
- `update()` is the explicit rerender entrypoint
- `@onUpdated([...])` can decorate `update()` directly to declare rerender dependencies
- `RadiantComponent` now owns host-aware SSR through `renderHost()` / `renderHostToString()`
- Nitro can server-render a real custom-element host with light-DOM markup and hydration markers
- the client can hydrate that host markup instead of immediately replacing it
- fragment endpoints can now ship a browser-importable client module URL with the SSR markup so lazy components register before insertion
- the playground now consumes the canonical render result from `@ecopages/radiant/server/render-component`, while Nitro only adapts that metadata into route responses
- the playground now includes an event policy lab that demonstrates `on:*` auto delegation and the `on-native:*` escape hatch under blocked bubbling

## Current Status

The playground now first-response SSR renders the page shell through Nitro using the standard `<!--ssr-outlet-->` flow.
That means it demonstrates:

- server rendering of a `RadiantComponent` host
- Nitro page-level SSR for the initial document
- light-DOM hydration of that host on the client
- page-level hydration from server HTML on first paint
- on-demand SSR fragment hydration for components that were not in the initial client bundle
- a thin transport adapter where route headers are derived from canonical render metadata instead of a playground-specific SSR payload type
