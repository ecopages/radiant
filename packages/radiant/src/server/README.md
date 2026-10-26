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

Radiant SSR is **light-DOM only**, like the client render path. The pipeline does not emit declarative shadow roots.

For adapters, fragment responses, and framework integrations, prefer `renderComponent()` / `renderComponentToString()` from `@ecopages/radiant/server/render-component`. Those default to **hydrate** mode (`normalizeRenderOptions`). Lower-level host serialization lives on `@ecopages/radiant/server/radiant-element-ssr`, not as Element Host instance methods:

- **Host to string:** `renderRadiantElementHostToString` — defaults to **plain** mode (`{}` is not hydrate). Pass `{ mode: 'hydrate' }` for the host stamp and hydration scripts.
- **Host as JSX:** `renderRadiantElementHost` — always hydrate mode.
- **View-only:** `renderRadiantElementViewToString`. It prepares the host, renders inside its context providers, and flushes `@bindTo` once. It returns the view without a host tag, so it never stamps; a caller that writes the host tag itself adds `SERVER_RENDERED_HOST_ATTRIBUTE`.
- **JSX / custom-element SSR integration:** `withRadiantServerCustomElementRenderBridge`, `renderRegisteredRadiantElementHost`, `renderRegisteredRadiantElementHostToString`
- **Host stamp:** `SERVER_RENDERED_HOST_ATTRIBUTE` (`data-radiant-ssr`). Hydrate-mode host serialization writes it on every host: `children` on a host that takes its children as a value from the view around it, `authored` on a render-owning host it rendered with Authored Children that fill a named slot (shipped in its slot-projection payload), and an empty value otherwise. The client host reads and removes it at first connect into `isServerRendered`. Plain mode does not write it.
- **Advanced / runtime:** `getOrCreateRadiantElementSsrRuntime`, `withServerRadiantElementSsrRuntime`, `createRadiantElementSsrService`, `getRadiantElementHostSsrAttributes`, `resolveRadiantElementRenderBridge`

On the client, the stamp decides how a server-rendered host takes its children. A host stamped `authored` keeps its Authored Children for its lifetime and ignores any Children Value, including the one page-level JSX passes when it hydrates over the host. A host stamped `children` waits for its Children Value and takes it. A host with an empty stamp, such as one a view rendered with no children, or one whose Authored Children only fill its default slot, takes a Children Value a view passes, which renders those children in the same place with live bindings.

Each host serialization is one pass: align the tag and legacy readiness, apply children, prepare once, render the view, flush `@bindTo`, then read attributes, the slot-projection payload, and hydration bindings from that final state. A later, separate serialization prepares again so changed inputs are honoured. `renderComponent()` builds `preview` by wrapping that markup; it does not serialize the host a second time.

When a render-owning host has **Authored Children**, host serialization emits the slot-projection payload needed to reconstruct default and named light-DOM assignments on the client, even when its current server-time view does not contain a `<slot>`. A View-owned Shell has no render lifecycle, so its children stay in the markup without a payload.

Under `withRadiantServerCustomElementRenderBridge` in hydrate mode, a render-owning host inside another host's view receives a **Children Value**, as it does when the client renders that view. Its own render places it, so it serializes inside its context providers and in its marker namespace, and it emits no slot-projection payload. The client gets that value back only from the parent's view, so the parent host must be defined on the client too. Such a host is stamped `data-radiant-ssr="children"`: on the client it stays inert (no event bindings, no `onConnected()`) until the parent's view hands it its Children Value, then hydrates, so a nested host whose parent never renders on the client stays inert server markup. In plain mode nothing makes the host wait for that value (it is not stamped) and its parent may never render on the client, so the same host takes the Authored Children path below, with the slot-projection payload, and still renders its children when its parent is not defined on the client. Any other host claimed by the bridge, such as one in a page rendered outside every host view, or a host without a `render()` override, receives its JSX children as **Authored Children** in light-DOM nodes (`renderServerLightDom` from `@ecopages/jsx/server`), not as an HTML string to parse. Text and attribute values go straight into the DOM, so they are escaped exactly once, when the host serializes. The children are built inside the host's own context providers, after construction and legacy decorator setup but before `prepareForSsr`. A context consumer passed as a child of a provider host therefore resolves that provider during SSR. It sees values set by construction or decorators (`initialValue`), but not values the provider only sets during preparation.

A host the page places inside `svg` or `math` is serialized on its own, but the browser parses its content in that namespace, where `style`, `xmp` and the other raw-text tags are ordinary elements. The bridge takes the namespace from the hook context (`foreignContent`) and serializes the host's Authored Children, its view and its Children Value in it, so their text is entity-escaped as in the rest of the page. A host under an SVG `foreignObject`, `desc` or `title` is back in HTML, and its CSS stays raw.

A host's own view can put `<slot />` inside `svg` or `math` too. Its Authored Children are light-DOM nodes under the host, in HTML, but the browser parses them where the slot puts them. The view render tracks the namespace of each slot by the same rule (`svg` and `math` enter foreign content; only an SVG `foreignObject`, `desc` or `title` returns to HTML) and emits each element assigned to a foreign slot in that namespace (`serializeNodeInNamespace`), so text in a slotted `style`, `xmp` or `noframes` is entity-escaped. A slot in HTML, including one under an SVG `foreignObject`, emits its nodes unchanged. The slot-projection payload keeps the HTML spelling, since the client parses it in a `<template>`. On the client the live nodes move into the slot as before.

An integration that registers its own hook with `withServerCustomElementRenderHook` instead of using the bridge decides where a host's children are built. By default they are built before the hook runs, outside the host's context providers, so a consumer passed as a child of a provider host renders its fallback state in the server HTML. Register the hook with `{ ownsChildren: true }`, take `applyChildren` from the hook context, and call it inside the host's providers:

```ts
withServerCustomElementRenderHook(
	({ instance, applyChildren }) => {
		if (!instance || !resolveRadiantElementRenderBridge(instance)) return undefined;
		const service = createRadiantElementSsrService(instance);
		service.applyLightDom(() => applyChildren?.());
		return createMarkupNodeLike(service.renderHostToString({ mode: 'hydrate' }));
	},
	render,
	{ ownsChildren: true },
);
```

Hosts the hook does not claim still get their children applied as usual. `test/server/custom-element-hook-children.test.tsx` covers both shapes. Without the change the page is still correct after hydration, because a consumer resolves its provider when it connects; the server HTML is what differs.

### Typed Boolean host attributes

`@prop({ type: Boolean })` follows the rule in [`resolveHostAttributes`](element-ssr/host-attribute-serialization.ts): omit `false` unless the declared default is `true`; otherwise write `"true"` / `"false"`. A true-default prop therefore round-trips explicit `false` through SSR so a client upgrade cannot restore the default before hydration. A false-default prop omits `false` and writes `name="true"` when true. That is not HTML presence (`name` with an empty value).

A selector like `[enabled]` matches `"true"` and `"false"`. Prefer `[enabled="true"]` / `[enabled="false"]`, or drive styles from component state attributes/classes (`data-state`, etc.).

Generic JSX `prop:*` bindings remain client-only and do not stringify property values into HTML; use the Radiant SSR host bridge (or a reflected attribute) when pre-hydration state must appear in markup.

`RadiantController` does not expose host-owned SSR instance methods. For controller-owned SSR, use the explicit `renderController*()` helpers from `@ecopages/radiant/server/render-controller` and provide the authored host tag and attributes declaratively.

Important: `renderController()` owns only the inner view plus the serialized host attributes. The caller still owns the outer host contract through `tagName`, `host`, and `attributes`, and `data-controller` is inferred only when the controller constructor carries `@controller(...)` metadata.

## Async Boundary

The `renderComponent*()` and `renderController*()` helpers are async so adapters can
resolve assets, client module URLs, and server-side data before rendering.

The actual JSX serialization pass is still synchronous. Fetch or prepare data
before calling the render helper, then inject resolved values through
`initialize`, `prepareHost`, or explicit host attributes. Do not perform async
work inside `render()`.

`createResource(...)` starts only from the Element Host's client connect pass,
after authored attributes synchronize. Server serialization never starts
resource fetches, regardless of the active package export condition.

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
- `renderComponentWithPreview()` returns payload fields plus a JSX-compatible preview that wraps the same markup. In plain mode that preview has no hydration stamp.
- `ssrContext` injects ambient context values for standalone `renderComponent` renders. Both `renderComponent` and `renderController` resolve consumed contexts before `initialize`; controllers inherit the active provider context. Preparation and `connect()` resolve them again, but a host gets one `connectedContextCallback`, mounted event and context update callback per provider and context value, so a selector returning a fresh object still runs once.
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

Production SSR uses the minimal light-DOM shim from `@ecopages/radiant/server/install-ssr-runtime`. The tests follow that split:

- **Node project:** SSR tests run on the shim.
- **`*.browser.test.*` files:** client tests run in Chromium through vitest browser mode.
- **Hydration tests:** they start from real server output. `test/server/ssr-hydration-fixtures.test.tsx` renders `test/fixtures/ssr-hydration/cases.tsx` on the shim into file snapshots, and `test/client/ssr-hydration.browser.test.tsx` hydrates those files in Chromium. After a change to server output, update the snapshots with `vitest run -u`.

The shim supports a focused query surface for component lifecycle code that runs during SSR:

- `element.querySelector(selector)`
- `element.querySelectorAll(selector)`
- `element.closest(selector)`
- `element.matches(selector)`
- `element.contains(otherNode)`
- `element.parentElement`
- Node traversal: `childNodes`, `firstChild`, `lastChild`, `nextSibling`, `previousSibling`, `firstElementChild`, `lastElementChild`, `nextElementSibling`, `previousElementSibling`, `childElementCount`
- Node edits: `append`, `prepend`, `before`, `after`, `replaceWith`, `remove`, `insertBefore`, `replaceChildren`, `insertAdjacentHTML`
- `document.createElement` / `createElementNS` (no namespaces), `createTextNode`, `createComment`. `createElement` of a registered custom-element tag still returns a generic minimal element: the component is not constructed and its view is not serialized. Use JSX for nested hosts that must server-render.
- `document.querySelector(selector)` / `document.querySelectorAll(selector)`
- `document.getElementById(id)`
- `element.style` (`setProperty`, property assignment, serializes to the `style` attribute)
- `element.children` (non-live snapshot array of element children; unlike browser `HTMLCollection`)
- `element.focus()` / `element.blur()` (no-op during SSR)
- `element.getBoundingClientRect()` / `element.getClientRects()` (zero-sized rects; no layout)
- `requestAnimationFrame` / `cancelAnimationFrame` (no-op during SSR; callbacks are not invoked)

**`children` semantics:** `element.children` returns a fresh array snapshot of current element children. It is not a live `HTMLCollection`. Holding a reference after DOM mutations does not update the cached array; re-read `element.children` after changes.

**Focus and layout:** the shim provides no-op `focus()` / `blur()` and zero-sized `getBoundingClientRect()` / `getClientRects()`. `@onUpdated` runs during SSR preparation, and hosts may `queueMicrotask` from there, so those calls must not throw. The methods do not move focus or compute layout; hydration owns real focus and geometry. `updated()` still never runs on the server.

**Animation frames:** SSR installs no-op `requestAnimationFrame` / `cancelAnimationFrame` so layout-aware `connectedCallback` code does not throw. Deferred work scheduled through rAF does not run during serialization; hydration must own client-side layout effects.

**Document event listeners:** Radiant mounts a singleton `MinimalDocument` on `globalThis.document` during SSR. Because `document` is defined on the server, `typeof document !== 'undefined'` checks evaluate to `true` during SSR. Top-level event listeners on `document` or `window` must be guarded with `!isServer` from `@ecopages/radiant/is-server` so browser navigation and event listeners do not attach during SSR. `isServer` follows the package export condition; it remains `true` in Node tests that install a browser-like DOM. Check the DOM implementation when choosing DOM-specific behavior.

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

Parsed elements keep their source HTML. Child nodes are built on first read (`childNodes`, `children`, or a query that traverses descendants), so nested selectors such as `header > h2` work after `innerHTML` assignment without paying full tree materialization cost during plain serialization. Reading never invalidates the source: a parsed subtree serializes exactly as written until something in it changes. A mutation (attribute, child list, or text) drops the cached source of that element and its ancestors, and only those are re-serialized.

**Parsing contract.** The parser follows the HTML tokenizer for conforming HTML, which is what JSX and well-formed authored markup produce:

- Character references decode as the spec says, in text and attribute values, from the full WHATWG table (`src/utils/html-entity-table.generated.ts`, regenerated by `scripts/generate-html-entity-table.ts`). That covers legacy references without a semicolon, with the attribute exception (`?a=1&copy=2` stays literal), the Windows-1252 remap for `&#x80;`–`&#x9F;`, and U+FFFD for invalid code points.
- Parsed text is written back from its source only while that source still means the same thing: it decodes to the node's value, holds no `<`, and does not end in a partial character reference. Otherwise it is escaped from the value, so text moved between parents or merged with appended text cannot turn into markup or new entities.
- In HTML, raw text elements (`script`, `style`, `xmp`, `iframe`, `noembed`, `noframes`) and escapable raw text elements (`textarea`, `title`) hold one text node up to the matching close tag. Markup-like strings inside them are not tags. Raw text is never decoded. When code sets it, the serializer joins the element's text and emits it unescaped, rewriting only `</tag` followed by whitespace, `/` or `>` (case-insensitive), so CSS such as `@media (width < 600px)` stays byte-identical. Inside `svg` or `math` these tags are ordinary elements, so their text is entity-escaped like any other text. Only `foreignObject`, `desc` and `title` under `svg` return to HTML. Everything under `math` stays foreign, so text in `math > mi > style` is escaped too: it never becomes markup, but it is not read as CSS.
- A node without a parent is in HTML unless `setDetachedRootNamespace` says otherwise. The bridge sets it on a host that sits inside `svg` or `math`, so the host's light DOM serializes as the browser parses it there; once the node has a parent, the parent decides. `serializeNodeInNamespace` overrides the namespace of one node, whatever its parent, for the duration of one serialization; it serializes the subtree from its nodes, not from the source HTML kept from parsing it, which spells the content for the context it was parsed in.
- Elements carry no namespace, but the parser tracks foreign content by the same rule. Inside `svg` or `math`, the tags above nest like any element: their content is markup, character references decode, comments are comments, and `<![CDATA[…]]>` is text holding its content as written. A `</style>` inside a CDATA section or comment there does not end the element. In HTML, `<![CDATA[` starts a bogus comment, as in browsers.
- Comments are comment nodes. `<!-->` and `<!--->` are empty comments. `<?…>`, `<!…>` and `</` followed by a non-letter are bogus comments, while `<!doctype>` and `</>` are dropped. A `<` that cannot start markup (`a < b`) is text.
- CR and CRLF become LF, and for duplicate attributes the first one wins. Adjacent text left after dropped markup is merged.
- A newline directly after a `pre`, `listing` or `textarea` start tag is dropped on parse. `innerHTML` assignment is fragment parsing, so it keeps a leading newline, and the `innerHTML` getter adds none, as in browsers. When the element is serialized with its start tag (`outerHTML`, or inside a parent) and its text starts with a newline, one extra newline is written, so the browser's parse yields the same text. Chromium does not write it, so its own round trip loses that newline.

**Not supported (non-conforming input).** The tree-construction repairs browsers apply to malformed markup are out of scope: implied end tags (`<p>a<div>`), foster parenting of misplaced table content, implied `tbody`, and the adoption agency for misnested formatting. Related deviations:

- Self-closing syntax on non-void HTML elements (`<x-card />`) is honored in the tree. Browsers ignore the slash and leave the element open, so the serializer always writes such elements with an explicit close tag.
- Attribute names are stored as written and are case-sensitive.
- Truncated and malformed markup is not repaired: input that ends inside a tag (`a <b`), a comment closed by `--!>`, and an unterminated `<!--a>` differ from the spec.
- HTML tags that break out of foreign content (`<svg><p>`) stay inside it, and `annotation-xml` is foreign whatever its `encoding`. `noscript` is not raw text, and the script comment-escape states (`<script><!--<script>`) are not followed.
- Unquoted attribute values that contain `/` (`<a href=/path/to>`) are split into several attributes. Serialization is unaffected because the source is kept.

`test/server/minimal-dom-differential.browser.test.ts` runs in Chromium on generated conforming HTML. It applies the same parsing, queries, mutations and `insertAdjacentHTML` calls to the shim and to Chromium, then checks two things:

- **Same tree:** both DOMs hold the same tree.
- **Same reading:** Chromium parses the shim's serialization back into the shim's tree.

It knowingly leaves out three cases:

- **Processing instructions:** the spec parses `<?…?>` as a bogus comment, while current Chromium creates a processing instruction.
- **Legacy references in attribute values:** Chromium's `innerHTML` fast path decodes some that the spec keeps literal.
- **Leading newline in `pre`:** set text starting with a newline (see above).

Unit tests pin the spec behaviour for all three. When the shim gains a behavior, extend that generator.

SSR hosts created with `new Component()` also align `localName` / `tagName` to the `@customElement` metadata before host preparation and serialization, so in-memory queries like `closest('my-element')` match the tag names used in the rendered HTML.

### SSR gap registry

Track minimal-DOM workarounds here before considering a heavier DOM backend. A backend spike is warranted only when multiple categories keep forcing shared workarounds.

| API / limitation                      | Category           | Components                         | Workaround                                                                                    |
| ------------------------------------- | ------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `:not`, `:scope`, sibling combinators | selector           | dialog, toolbar, tooltip, treegrid | Simple selectors + JS post-filter via shared query helpers                                    |
| `:checked`                            | selector           | field (radio-group aria target)    | Query `input[type="radio"]`, then filter on the `checked` property with an attribute fallback |
| `instanceof HTMLLabelElement`         | prototype-identity | combobox                           | `tagName.toLowerCase() === 'label'`                                                           |
| `requestAnimationFrame` callbacks     | timing             | toast, toaster                     | No-op shim during SSR; hydrate owns layout                                                    |
| Live `HTMLCollection` for `children`  | dom-api            | treegrid                           | Read `children` snapshot or filter `childNodes` directly                                      |

## Related Docs

- See [../core/README.md](../core/README.md) for the `RadiantElement` lifecycle and hydration flow.
- See [../../README.md](../../README.md) for the top-level package overview and public entrypoints.
