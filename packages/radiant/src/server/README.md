# Radiant Server

Radiant's server-facing APIs live on explicit `@ecopages/radiant/server/*` entrypoints.

Use the root `@ecopages/radiant` entrypoint for `RadiantElement`, `RadiantController`, reactive JSX bindings (`this.bind(...)`, `this.$.key`, `this.bindings.key`), and the common decorators that are primarily consumed on the client. Import context APIs, controller-registry helpers, and the low-level helper factories from their explicit public subpaths. Use the server subpaths when you are building SSR adapters, pre-rendering custom-element hosts, or preparing a server runtime.

When SSR markup should hydrate in the browser, pair these server entrypoints with the explicit client hydrator import:

```ts
import '@ecopages/radiant/client/install-hydrator';
```

## Trust model

SSR host preparation APIs accept **author-controlled** HTML and DOM:

- `authoredContent` / `renderComponent({ prepareHost })` / `ServerRenderEnvironment.prepareHost(...)` / `insertAdjacentHTML` on the host
- plain-mode authored hydration markup concatenated into the host
- client `RadiantElement.renderTemplate({ template })` via `innerHTML`

These surfaces are not a sanitizer. Do not pass untrusted user input. Escape or sanitize at the adapter boundary before calling Radiant when content is not fully trusted. Attribute **values**, hydration JSON script bodies, and minimal-DOM text-node serialization are escaped by Radiant; attribute **names** and host **tag names** are validated and rejected when invalid.

## Import Paths

- `@ecopages/radiant/server/install-ssr-runtime` — canonical Node SSR boot (shim, HTML parsers, JSX scope adapters). Prefer this over narrower install paths.
- `@ecopages/radiant/server/install-light-dom-shim` — side-effect shim install only (narrower than `install-ssr-runtime`).
- `@ecopages/radiant/server/light-dom-shim` — minimal SSR window and host-preparation helpers.
- `@ecopages/radiant/server/render-component` — portable component rendering helpers and shared transport-neutral metadata.
- `@ecopages/radiant/server/render-controller` — controller-host rendering helpers and controller-specific host option types.
- `@ecopages/radiant/server/radiant-element-ssr` — lower-level host serialization (see SSR Surfaces).
- `@ecopages/radiant/server/project-root` — project-root resolution for adapters that discover client modules or config files.

Apps must import only documented `package.json` export paths. Nested folders under `src/server/` (`adapters/`, `element-ssr/`, `shim/`, …) are internal implementation.

## Source layout

Internal modules are grouped under `src/server/` while public `package.json` export paths stay stable via thin re-export stubs:

```
server/
  install/       # install-ssr-runtime, install-light-dom-shim
  shim/          # light-dom-shim facade + minimal-dom/*
  html/          # html-parser
  element-ssr/   # host serialization bridge, service, attributes, scripts
  adapters/      # render-component, render-controller, render-types, render-shared
  context-ssr.ts
  project-root.ts
  radiant-element-ssr.ts   # public barrel over element-ssr/
  *.ts                   # thin public entry re-exports for package.json
```

## SSR Surfaces

Radiant SSR is **light-DOM only**. Hosts with `renderRootMode = 'shadow'` throw during server serialization — the pipeline does not emit declarative shadow roots. Client-side shadow rendering remains supported; skip SSR for those hosts.

For adapters, fragment responses, and framework integrations, prefer the explicit helpers from `@ecopages/radiant/server/render-component` (for example `renderComponent()` / `renderComponentToString()`). Prefer `render-component` unless you are writing a renderer integration.

Lower-level host serialization lives on `@ecopages/radiant/server/radiant-element-ssr`, not as Element Host instance methods:

- **Adapter default:** `renderRadiantElementHostToString`
- **View-only:** `renderRadiantElementViewToString`
- **JSX / custom-element SSR integration:** `withRadiantServerCustomElementRenderBridge`, `renderRegisteredRadiantElementHost`, `renderRegisteredRadiantElementHostToString`
- **Advanced / runtime:** `getOrCreateRadiantElementSsrRuntime`, `withServerRadiantElementSsrRuntime`, `createRadiantElementSsrService`, `getRadiantElementHostSsrAttributes`, `resolveRadiantElementRenderBridge`

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

## Adapter install (copy-paste)

One boot path for Node adapters:

1. Import `@ecopages/radiant/server/install-ssr-runtime` once at server boot (shim, HTML parsers, ALS scope adapters). Server entrypoints such as `render-component` already import it; app SSR bundles should import it **first** when import order is not guaranteed.
2. Keep `@ecopages/*` **external** in the SSR bundler so Node resolves a single module instance (ALS and adapters are module-local).
3. Call `renderComponent(...)` or `renderComponentToString(...)` — await data and assets first; keep the scoped render snapshot synchronous.

### Server dist (published layout)

The server build may inline shared element/controller **client** modules; the inverse is forbidden — browser builds never emit `dist/server/*` or server-only chunks. Shared `dist/chunk-*.js` under the package root are server-graph artifacts. Depend only on documented `package.json` exports. Invariants are documented in TSDoc on `packages/radiant/build.ts` and `install-ssr-runtime.ts`.

**Allowed on `globalThis`:** Radiant-owned minimal-DOM constructors, `document` / `customElements` from the shim, controller registry, hydrator flags. Installation first checks for a complete usable DOM and leaves it unchanged; missing, malformed, or partial DOM globals are replaced with Radiant's coherent minimal surface rather than patched in place. SSR scope adapters and HTML parser registration stay module-local.

```ts
import '@ecopages/radiant/server/install-ssr-runtime';
import { renderComponent } from '@ecopages/radiant/server/render-component';

const rendered = await renderComponent(CounterCard, {
	initialize: (card) => {
		card.count = 4;
	},
});
```

Prefer `install-ssr-runtime` over calling `installLightDomShim()` alone when you need Radiant host SSR (adapters + runtime lookup). Use `createServerRenderEnvironment()` when you only need host preparation helpers on top of an already-installed runtime.

Lower-level host serialization is also exported as `@ecopages/radiant/server/radiant-element-ssr` (`renderRadiantElementHostToString`). Prefer `render-component` for adapters.

## Runtime Preparation

If you are not using `install-ssr-runtime` and your process has no DOM or only a partial DOM-like global surface, install the light-DOM shim before importing Radiant element modules:

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

## Supported SSR DOM APIs

Production SSR uses the minimal light-DOM shim from `@ecopages/radiant/server/install-ssr-runtime`, not happy-dom. Vitest files that opt into `happy-dom` exercise browser-like behavior; they do not represent the Node SSR runtime.

The shim supports a focused query surface for component lifecycle code that runs during SSR:

- `element.querySelector(selector)`
- `element.querySelectorAll(selector)`
- `element.closest(selector)`
- `element.matches(selector)`
- `element.contains(otherNode)`
- `element.parentElement`
- `document.querySelector(selector)` / `document.querySelectorAll(selector)`
- `document.getElementById(id)`
- `element.style` (`setProperty`, property assignment, serializes to the `style` attribute)
- `element.children` (non-live snapshot array of element children; unlike browser `HTMLCollection`)
- `requestAnimationFrame` / `cancelAnimationFrame` (no-op during SSR; callbacks are not invoked)

**`children` semantics:** `element.children` returns a fresh array snapshot of current element children. It is not a live `HTMLCollection`. Holding a reference after DOM mutations does not update the cached array; re-read `element.children` after changes.

**Animation frames:** SSR installs no-op `requestAnimationFrame` / `cancelAnimationFrame` so layout-aware `connectedCallback` code does not throw. Deferred work scheduled through rAF does not run during serialization; hydration must own client-side layout effects.

**Supported selector syntax (v1):**

- Tag names, including custom elements (`rui-disclosure`, `button`)
- `#id`, `.class`
- `[attr]`, `[attr="value"]`
- Descendant (` `) and child (`>`) combinators
- Comma-separated selector lists

**Unsupported (throws `SyntaxError`):**

- Pseudo-classes (`:not`, `:has`, `:focus`, …)
- `:scope`, sibling combinators (`+`, `~`)
- Shadow-root queries (SSR is light-DOM only)

Fragment-backed nodes materialize children lazily when a query traverses descendants, so nested selectors such as `header > h2` work after `innerHTML` assignment without paying full tree materialization cost during plain serialization.

SSR hosts created with `new Component()` also align `localName` / `tagName` to the `@customElement` metadata before host preparation and serialization, so in-memory queries like `closest('my-element')` match the tag names used in the rendered HTML.

### SSR gap registry

Track minimal-DOM workarounds here before considering a heavier DOM backend. A backend spike is warranted only when multiple categories keep forcing shared workarounds.

| API / limitation | Category | Components | Workaround |
| ---------------- | -------- | ---------- | ---------- |
| `:not`, `:scope`, sibling combinators | selector | dialog, toolbar, tooltip, treegrid | Simple selectors + JS post-filter via shared query helpers |
| `instanceof HTMLLabelElement` | prototype-identity | combobox | `tagName.toLowerCase() === 'label'` |
| `requestAnimationFrame` callbacks | timing | toast, toaster | No-op shim during SSR; hydrate owns layout |
| Live `HTMLCollection` for `children` | dom-api | treegrid | Read `children` snapshot or filter `childNodes` directly |

## Related Docs

- See [../core/README.md](../core/README.md) for the `RadiantElement` lifecycle and hydration flow.
- See [../../README.md](../../README.md) for the top-level package overview and public entrypoints.
