# Radiant Server

Radiant's server-facing APIs live on explicit `@ecopages/radiant/server/*` entrypoints.

Use the root `@ecopages/radiant` entrypoint for component bases, decorators, and context helpers that are primarily consumed on the client. Use the server subpaths when you are building SSR adapters, pre-rendering custom-element hosts, or preparing a server runtime.

## Import Paths

- `@ecopages/radiant/server/light-dom-shim` prepares a minimal SSR runtime and host environment.
- `@ecopages/radiant/server/render-component` exposes portable component rendering helpers and metadata utilities.
- `@ecopages/radiant/server/project-root` resolves a project root for adapters that need to discover client modules or config files.

## SSR Surfaces

`RadiantComponent` exposes two host serialization methods:

- `renderToString()` serializes the component view only.
- `renderHostToString()` serializes the custom-element host together with the current view.

In practice, `renderHostToString()` is the right default for full component SSR because it emits `<my-element>...</my-element>` instead of only the view fragment.

When a component renders literal `<slot>` tags, `renderHostToString()` also serializes the slot-projection payload needed to reconstruct default and named light-DOM assignments on the client.

## Runtime Preparation

If your SSR runtime does not provide `HTMLElement` or `customElements`, install the light-DOM shim before importing Radiant component modules:

```ts
import { installLightDomShim } from '@ecopages/radiant/server/light-dom-shim';

installLightDomShim();
```

For lower-level control, `createServerRenderEnvironment()` lets adapters prepare authored light-DOM content before serialization.

## Portable Fragment Rendering

For framework adapters and fragment rendering, import the reusable server helpers from `@ecopages/radiant/server/render-component`.

```ts
import {
	createRenderedComponentHeaders,
	renderComponent,
	toRenderedComponentPayload,
	type RenderedComponentAsset,
} from '@ecopages/radiant/server/render-component';
import { createServerRenderEnvironment } from '@ecopages/radiant/server/light-dom-shim';

const environment = createServerRenderEnvironment();

const assets: readonly RenderedComponentAsset[] = [
	{ kind: 'script-module', src: '/components/counter-card.js', stage: 'hydrate' },
];

const rendered = await renderComponent({
	component: CounterCard,
	initialize: (component) => {
		component.label = 'Server counter';
		component.count = 4;
	},
	prepareHost: (host) => {
		host.insertAdjacentHTML('beforeend', '<p>Server projected content</p>');
	},
	assets,
	environment,
});

const payload = toRenderedComponentPayload(rendered);
const headers = createRenderedComponentHeaders(rendered.metadata);
```

Other useful server helpers:

- `renderComponentToString()` returns only the host markup string.
- `renderComponentToPayload()` returns the flat payload shape directly.
- `renderStreamableComponent()` returns payload fields plus a JSX-compatible preview value.
- `ssrContext` injects ambient context values for standalone fragment renders.
- `assets` and `resolveAssets(...)` describe runtime scripts, styles, and preload hints through a transport-agnostic metadata model.
- `prepareHost(...)` is the dedicated host-preparation hook when slot-aware SSR needs authored light-DOM nodes, not just an HTML string.
- `clientModuleSrc` and `resolveClientModuleSrc(...)` remain as compatibility shorthands for one hydration module.

## Related Docs

- See [../core/README.md](../core/README.md) for the `RadiantComponent` lifecycle and hydration flow.
- See [../../README.md](../../README.md) for the top-level package overview and public entrypoints.
