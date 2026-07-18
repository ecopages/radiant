# Radiant Server

Radiant's server-facing APIs live on explicit `@ecopages/radiant/server/*` entrypoints.

Use the root `@ecopages/radiant` entrypoint for `RadiantElement`, `RadiantController`, `bindReactiveValue(...)`, and the common decorators that are primarily consumed on the client. Import context APIs, controller-registry helpers, and the low-level helper factories from their explicit public subpaths. Use the server subpaths when you are building SSR adapters, pre-rendering custom-element hosts, or preparing a server runtime.

When SSR markup should hydrate in the browser, pair these server entrypoints with the explicit client hydrator import:

```ts
import '@ecopages/radiant/client/install-hydrator';
```

## Import Paths

- `@ecopages/radiant/server/light-dom-shim` prepares a minimal SSR runtime and host environment.
- `@ecopages/radiant/server/render-component` exposes portable component rendering helpers and shared transport-neutral metadata.
- `@ecopages/radiant/server/render-controller` exposes controller-host rendering helpers and controller-specific host option types.
- `@ecopages/radiant/server/project-root` resolves a project root for adapters that need to discover client modules or config files.

## SSR Surfaces

Radiant SSR is **light-DOM only**. Hosts with `renderRootMode = 'shadow'` throw during server serialization — the pipeline does not emit declarative shadow roots. Client-side shadow rendering remains supported; skip SSR for those hosts.

For adapters, fragment responses, and framework integrations, prefer the explicit helpers from `@ecopages/radiant/server/render-component` (for example `renderComponent()` / `renderComponentToString()`). Lower-level host serialization lives on the server bridge (`renderRadiantElementHostToString`), not as Element Host instance methods.

When a component renders literal `<slot>` tags, host serialization also emits the slot-projection payload needed to reconstruct default and named light-DOM assignments on the client.

`RadiantElement.renderViewToString()` remains the narrow host hook that asks the installed server runtime to serialize the JSX view only.

`RadiantController` does not expose host-owned SSR instance methods. For controller-owned SSR, use the explicit `renderController*()` helpers from `@ecopages/radiant/server/render-controller` and provide the authored host tag and attributes declaratively.

Important: `renderController()` owns only the inner view plus the serialized host attributes. The caller still owns the outer host contract through `tagName`, `host`, and `attributes`, and `data-controller` is inferred only when the controller constructor carries `@controller(...)` metadata.

## Async Boundary

The `renderComponent*()` and `renderController*()` helpers are async so adapters can
resolve assets, client module URLs, and server-side data before rendering.

The actual JSX serialization pass is still synchronous. Fetch or prepare data
before calling the render helper, then inject resolved values through
`initialize`, `prepareHost`, or explicit host attributes. Do not perform async
work inside `render()`.

## Runtime Preparation

If your SSR runtime does not provide `HTMLElement` or `customElements`, install the light-DOM shim before importing Radiant element modules:

```ts
import { installLightDomShim } from '@ecopages/radiant/server/light-dom-shim';

installLightDomShim();
```

For lower-level control, `createServerRenderEnvironment()` lets adapters prepare authored light-DOM content before serialization.

## Portable Fragment Rendering

For framework adapters and fragment rendering, import the reusable server helpers from `@ecopages/radiant/server/render-component`.

```ts
import {
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
```

Other useful server helpers:

- `renderComponentToString()` returns only the host markup string.
- `renderComponentToPayload()` returns the flat payload shape directly.
- `renderComponentWithPreview()` returns payload fields plus a JSX-compatible preview value.
- `ssrContext` injects ambient context values for standalone fragment renders.
- `assets` and `resolveAssets(...)` describe runtime scripts, styles, and preload hints through a transport-agnostic metadata model.
- `prepareHost(...)` is the dedicated host-preparation hook when slot-aware SSR needs authored light-DOM nodes, not just an HTML string.
- `clientModuleSrc` and `resolveClientModuleSrc(...)` are focused shorthands for one hydration module.

Controller-specific server helpers live on `@ecopages/radiant/server/render-controller`:

- `renderController()` renders a controller-owned host into the same portable fragment shape used by `renderComponent()`.
- `renderControllerToString()` returns only the controller host markup string.
- `renderControllerToPayload()` returns the flat controller fragment payload shape directly.
- `renderControllerWithPreview()` returns controller fragment fields plus a JSX-compatible preview value.

Controller SSR follows one extra rule: the caller still owns the outer host markup contract. Pass the host `tagName`, use `host.data` and `host.aria` for JSX-like structured attributes, and let `renderController()` infer `data-controller` from `@controller(...)` metadata unless you need to override it through the low-level `attributes` option.

Note: the server helpers are transport-neutral. The package no longer ships the older fragment-header constants or header-builder helpers from this module. Adapter-specific response headers now belong in the integration layer that turns `RenderedComponent` metadata into HTTP responses.

## Related Docs

- See [../core/README.md](../core/README.md) for the `RadiantElement` lifecycle and hydration flow.
- See [../../README.md](../../README.md) for the top-level package overview and public entrypoints.
