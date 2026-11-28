# Radiant

Radiant is a light-DOM platform for custom elements and DOM-attached controllers.

It keeps browser primitives visible instead of wrapping them in a synthetic component model. You work with real custom elements, real DOM events, real attributes, and real light-DOM children. Use `RadiantElement` when you want reactive fields, JSX-backed rendering, SSR host serialization, and hydration on a real custom element. Use `RadiantController` when you want behavior attached to existing DOM instead of defining a custom element.

Radiant deliberately renders into light DOM only; it has no shadow render mode. That keeps styling, DOM inspection, authored child content, and ARIA id references between host-owned and authored nodes simple, while giving up the encapsulation that conventional custom-element guidance usually prefers.

For the full docs site, see [radiant.ecopages.app](https://radiant.ecopages.app/).

## Installation

`@ecopages/radiant` is the core package. `@ecopages/jsx` provides TSX rendering, and `@ecopages/signals` provides the renderer-agnostic reactive layer underneath Radiant.

`@ecopages/radiant` declares `@ecopages/jsx` and `@ecopages/signals` as peer dependencies. Radiant and JSX must share one Signals instance so bindings update across both packages.

For the standard Radiant setup, install all three packages:

```sh
bun add @ecopages/radiant @ecopages/jsx @ecopages/signals
```

Application code does not need to import JSX helpers or Signals primitives directly for every feature, but both peer dependencies must be installed alongside Radiant.

The JSX renderer ships only when you use it. Radiant never imports it: `@ecopages/jsx` installs it when `@ecopages/jsx/jsx-runtime` loads, which every module compiled from JSX imports, and on the first `jsx()` call, so a view written as JSX or with `jsx()` finds it with no extra setup. An app whose elements only wire events, refs and reactive fields, without a JSX view, does not bundle the renderer. Without the renderer, a view that returns a plain value is written as text and one that returns a DOM node replaces the host's children; any other view, such as a lone signal, needs `import '@ecopages/jsx/jsx-runtime'` once, and `render()` throws an error naming it otherwise.

The packages publish one file per source module and declare `sideEffects`, so a bundler drops every module an app does not import.

## RadiantElement Mental Model

`RadiantElement` is the structured base class for reactive custom elements.

`@customElement(name, options)` registers autonomous custom elements only. Passing a defined `options.extends` value to define a customized built-in throws a `TypeError` at class definition time, and `extends` is excluded from the TypeScript options type.

`options.hostAttributes` gives a `RadiantElement` host fixed attributes, such as `{ role: 'complementary' }`. Server rendering writes them while it prepares the host, so they reach server output, and the client writes them at the start of every connect, before `onConnected()`. An attribute already on the host is never overwritten. A subclass inherits them and overrides them by name. State-dependent attributes stay with `@bindTo` and `@onUpdated`.

- `render()` returns the current JSX view.
- First connect automatically chooses between hydration and a fresh client render.
- `update()` runs the update cycle now: batched `@onUpdated` callbacks, the render when the host overrides `render()`, then `updated()`. It works on every host, so it also flushes `@onUpdated` synchronously on hosts without `render()`.
- `requestUpdate()` schedules that cycle in a microtask and coalesces repeated requests. `updateComplete` resolves when the cycle finishes and rejects when an `@onUpdated` callback, render, or `updated()` in it throws. A failed cycle discards its remaining queued work; a later write starts a fresh cycle.
- Hosts observe their reactive members only while connected. Changes made before connect or while detached are reported on the next connect, so a shared `@signal` source never keeps a removed host alive. `@bindTo` and `registerUpdateCallback` subscriptions are released on disconnect and re-established on reconnect, and a write made before connect or while detached runs them on connect, when the value changed, instead of at write time. Server rendering never connects hosts: it drains pending `@onUpdated` callbacks during host preparation and never calls `updated()`. A host the server render bridge claims, or that `renderComponent` renders, can also publish context before its Authored Children are built, through `registerSsrPreparationCallback(host, callback, 'beforeAuthoredChildren')`.
- `@prop(...)`, `@state`, and `@signal(...)` define reactive members. A `@prop` attribute defaults to the kebab-case property name (`minWidth` maps to `min-width`); `@attr` uses the same conversion for its source attribute, with consecutive underscores collapsing to one hyphen. `attribute` on `@prop` and `source` on `@attr` override the default and preserve the explicit name. JSX continues to use the camelCase property. HTML lowercases attribute names, so choose a lowercase explicit name when consumers author it in HTML. Pass `transform` on `@prop` to override default converters (`type: Array` is JSON unless you supply `fromAttribute` / `toAttribute`). `fromProperty` normalizes JS/JSX writes. `toAttribute` returning `null` or `''` omits the reflected attribute without changing the assigned property.
- The declared field type is the source of truth for `@prop(...)`, `@attr(...)`, `@signal(...)`, `@state`, `@bindTo(...)`, `@query(...)`, `@queryAll(...)`, `@ref(...)`, `@refAll(...)`, `@event(...)` and the context decorators: options that carry a value (`defaultValue`, `initial`, `transform`, `converter`, `type`, and `source` on `@signal`) must agree with it, and under standard decorators a mismatch is a compile error on the decorator. `@prop({ type: Number, defaultValue: 0 }) label: string` does not compile, and `@attr({ defaultValue: 'a' }) mode: 'a' | 'b'` does. A single-element `@query(...)` or `@ref(...)` field is `T | null`, and a `@queryAll(...)` or `@refAll(...)` field is `T[]`, so guard each single-element use. `@query(selector)` and `@queryAll(selector)` take a CSS selector string and read live and unscoped, the first match or `null` and an array respectively; `@ref(name)` and `@refAll(name)` read the `data-ref` parts the host owns. Write a decorated field with an initializer, `?` or `!`: `declare` and `accessor` fields do not compile. Legacy decorators (`experimentalDecorators: true`) never receive the field type, so none of these checks run there and a callback such as `@bindTo`'s `map` sees `unknown` unless you pass the whole field type, `undefined` included, as a type argument (`@bindTo<number>(...)`, `@bindTo<WritableSignal<number>>(...)` on a `@signal` field). The rules per decorator, the `type` constant and parsers are in [Typing Decorated Fields](https://radiant.ecopages.app/docs/decorators#typing-decorated-fields).
- An authored attribute stays on the host after upgrade, reflected or not: `reflect` only controls writing property changes back, so a non-reflected attribute is read at upgrade and not kept in sync afterwards.
- Upgrade safety: a value assigned to a host before its tag is defined becomes an own property of the not-yet-upgraded element. `@prop` members adopt it, and it wins over an authored attribute, so consumers never need to defer an element definition to avoid losing input. `@state`, `@signal` and `@fromStore` are internal members, not public input: they keep their initializer (or the store snapshot) and discard such a value. In development, a host that upgrades with one warns once per tag and member, naming the member and pointing to `@prop`; production builds drop the warning and `setDevWarningsEnabled(false)` from `@ecopages/jsx/jsx-dev-runtime` silences it. A pre-upgrade assignment also shadows a class accessor (hand-written `get`/`set`, an `accessor` field, or a library accessor decorator such as MobX `@observable accessor`), so the accessor never sees it; that warns once per tag and member the same way; to recover after upgrade, save the value, delete the own property and assign it again so it goes through the setter. Keep library state in a store passed through `@prop` or context, not in accessor members on the host.
- `@prop({ attribute: false })` makes a prop property-only: no observed attribute, an authored attribute of that name is ignored, it is never reflected and never serialized by server rendering. Use it for live objects such as class instances, which would otherwise leak their fields into the markup, lose their methods and, if cyclic, throw during SSR; `reflect: true` with it throws. Serialized props are public markup, so keep private or large data out of a prop that keeps its attribute. In development, server rendering warns once per tag and prop when a prop that keeps its attribute holds a class instance, a cycle or a function nested in an object or array (a function value itself is skipped with its own warning).
- Reflected properties serialize the current value on each write. On a connected host, a synchronous callback (`@bindTo`, `registerUpdateCallback`) that normalizes the assignment is reflected too.
- `@bindTo(...)` copies a reactive field onto existing DOM when the host does not own a `render()` tree. A function in an `attr`, `bool` or `text` write renders as nothing (attribute removed, text empty) instead of its source code; `prop` keeps it as a value. The same holds for `@attr`, a reflected `@prop`, and the attributes server rendering writes for a controller host or a reflected prop: the function is skipped, and development builds warn once per position (see Development Warnings).
- `@onUpdated(...)` runs once for members changed in the same batch, before the render commits. If its callback changes a watched member, it can run again in the same cycle until state settles. Use it for procedures that react to member changes. `updated()` is for work that needs the committed DOM.
- `this.bindings.key`, `this.$.key`, and `this.bind('key')` expose stable, per-instance JSX bindings for reactive members.
- A binding such as `this.$.data.position` follows changes to a `createStore(...)` path and replacement of `data`.
- If `render()` is omitted, authored light-DOM children pass through unchanged. Copy fields onto that DOM with `@bindTo(...)`.
- `registerConnectedCallback()` is a pre-sync hook: it runs synchronously when connection starts, before first-connect attribute catch-up. Use it only for setup that does not read authored property values. `onConnected()` runs after every connection, once attribute catch-up and (when `render()` is overridden) the initial hydrate/update have finished; use it instead of `connectedCallback` + `queueMicrotask(sync)` when work needs the synchronized host.
- `FormAssociatedElement` extends `RadiantElement` for native form controls. Each concrete subclass inherits the static FACE flag and owns one `ElementInternals`; implement `formValue()` and `restoreFormState()`, which the base calls on form reset and from `formStateRestoreCallback(state, mode)` when the browser restores or autofills the host (override it with `super` when a state is not parseable from an autofilled string). Override `formState()` when submission can be `null` before a name is assigned or uses multi-entry `FormData`, so reset keeps the authored value. The first form value sync, normally in the first connect cycle, records that reset state. `labels` returns the associated `<label>` elements (`ElementInternals.labels`).
- `{this.slotted}` places a render-owning host's children, and `{this.slotted ?? fallback}` gives a fallback, since it is `null` when there are none. A view that renders `<x-card>{children}</x-card>` hands a **Children Value** to the host, and only the host's renderer touches the nodes. Named regions are properties (`<x-card header={<h2 />}>` rendered with `{this.header}`). **Authored Children** are captured once, at first render; nodes appended later are not slotted. `this.slottedElements` reads the top-level elements the content rendered to. `<slot>` is an ordinary element. See [Slots](https://radiant.ecopages.app/docs/components/slots).

The key distinction is this:

- Use `@bindTo` when the host keeps authored DOM and a field should appear as an attribute, property, or text.
- Use bindings such as `this.$.count` when the host owns `render()`, the shape of the view stays the same, and only text, attribute, or child-value positions need to change.
- Read a reactive value directly in `render()` when it affects the structure of the JSX tree; changes to that value schedule a rerender.

Signal reads and `createStore(...)` property reads performed directly inside `render()` also participate in rerender invalidation, so shared reactive data can drive `RadiantElement` views without an extra wrapper layer.

## Counter Example

This counter shows the intended `RadiantElement` style for stable templates: public props stay explicit, internal state stays local, and bound child values update without forcing a full rerender of the whole template.

```tsx
/** @jsxImportSource @ecopages/jsx */

import type { JSX_PROPS } from '@ecopages/jsx';
import { RadiantElement, customElement, prop, state } from '@ecopages/radiant';

type CounterCardBindings = {
	count: number;
	label: string;
};

type CounterCardProps = {
	label?: string;
};

@customElement('counter-card')
export class CounterCard extends RadiantElement<CounterCardBindings> {
	declare readonly [JSX_PROPS]?: CounterCardProps;

	@prop({ type: String, defaultValue: 'Clicks' }) label!: string;
	@state count = 0;

	private readonly increment = () => {
		this.count += 1;
	};

	override render() {
		return (
			<section>
				<h2>{this.$.label}</h2>
				<p>Count: {this.$.count}</p>
				<button type="button" on:click={this.increment}>
					Increment
				</button>
			</section>
		);
	}
}

<CounterCard label="Clicks" />;
```

How this works:

- `@prop(...)` makes `label` part of the component's public reactive property and attribute surface.
- `@state` is internal mutable state.
- `this.$.label` and `this.$.count` are cached JSX bindings, so those text positions can update directly when the underlying reactive members change.
- This example does not call `update()`: the bindings patch child values directly.
- `JSX_PROPS` declares a public type that is narrower than the internal binding shape. That is usually the right split.

If the same type truly represents both internal bindings and public JSX attributes, you can reuse it for both. Otherwise, keep those contracts separate.

### Structural Changes

A reactive value read directly in `render()` schedules a rerender when it changes, including when it controls which elements exist.

```tsx
import { RadiantElement, state } from '@ecopages/radiant';

export class ResultsPanel extends RadiantElement {
	@state expanded = false;

	override render() {
		return this.expanded ? <p>Results</p> : <p>Collapsed</p>;
	}
}
```

Use `update()` for an immediate update or `requestUpdate()` for a scheduled one when the host must respond to a change outside the tracked reactive graph.

### Direct Reads And `this.$`

`{this.count}` and `{this.$.count}` look alike and behave differently. A direct read in `render()` makes the whole view depend on `count`, so each change runs `render()` again and reconciles the output; that is the right choice for branching, list shape and anything else the view structure depends on. `{this.$.count}` binds one node: a change patches that node and `render()` does not run. A value that changes every frame, such as a media position, belongs behind `this.$`.

In development, Radiant warns once per class and field in two cases where the direct read is clearly wasteful, naming the field and the host and the remedy. The warnings cover `@state`, `@prop` and `@fromStore` fields; a `@signal` field, an `@attr` field and a `createStore(...)` read or path write do not warn.

- Redundant path: a field is bound with `this.$` and also read directly in `render()`. Each change patches the bound node and then re-renders the view. A binding passed to a child host counts as bound.
- Hot field: one field re-runs one host's `render()` 30 times within a second. If the field fills one node or attribute, bind it with `this.$`; if it shapes the structure (a list length, a branch), keep the per-frame value out of `render()`: derive a coarser field for `render()` to read and keep the fast value in `this.$` bindings.

A host that reads a field directly without either pattern does not warn. Both warnings follow the development-warning rules in [Development Warnings](#development-warnings).

## Reactive JSX Bindings

Bindings are the non-obvious part of the API, and they are worth being explicit about.

`RadiantElement<Bindings>` takes a dedicated binding shape, not the full class type. That keeps the binding namespace limited to the reactive props or fields you want JSX to consume.

These three forms are equivalent:

- `this.bindings.count`
- `this.$.count`
- `this.bind('count')`

They all resolve through the same cached binding object.

For a `createStore(...)` member, `this.$.data.position` updates when that path changes, a missing key is added, or `data` is replaced. For a plain object member, nested bindings update when the member is replaced.

Use bindings when:

- the rendered element structure stays the same
- only text, attribute, or child-value positions need to change
- you want the renderer to patch the owned child range instead of rerunning the whole component view

A direct reactive read in `render()` rebuilds the JSX tree when that value changes.

### External stores

When the source of truth is a Zustand, Redux, or `useSyncExternalStore` store that other code already writes, do not copy snapshots into `@state`. `@fromStore(store, select)` is a read-only host field over that store. The host subscribes while connected, its `this.$` bindings included, and releases the store on disconnect. The server paints `getServerSnapshot()`, or the live snapshot when the store has none, and never subscribes.

```tsx
@fromStore(cartStore, (state) => state.items.length)
count!: number;
```

`{this.$.count}` patches that node. Assignment throws; writes stay on the store. A list whose shape changes should read the selected value in `render()`. When the store arrives through context, `registerReactiveMember('count', fromExternalStore(store, select))` in `@onContextUpdate` instead: `@contextSelector` will not see `setState` because the store object is not replaced. See [External stores](https://radiant.ecopages.app/docs/signals/signals-external-store) and [@fromStore](https://radiant.ecopages.app/docs/decorators/from-store).

## SSR And Hydration

Prefer the server pipeline for host HTML:

- import `@ecopages/radiant/server/install-ssr-runtime` once at server boot (shim + ALS scope adapters)
- `renderComponent(...)` / `renderComponentToString(...)` from `@ecopages/radiant/server/render-component` for adapters and fragments
- `renderRadiantElementHostToString(...)` from `@ecopages/radiant/server/radiant-element-ssr` for lower-level host serialization
- `renderRadiantElementViewToString(host, options)` from `@ecopages/radiant/server/radiant-element-ssr` serializes only the JSX view

There is no durable Element Host instance API named `renderHostToString()`. `renderComponent()` serializes each host once and wraps that markup as `preview`; it does not serialize the host a second time.

`mode: 'hydrate'` adds hydration markers for the component view and stamps each serialized host with a `data-radiant-ssr` attribute. A host reads that stamp once, at first connect, into `isServerRendered`. Use it, not `hasHydrationMarkers`, to tell whether a host's content came from the server: markers exist only where a view has bindings, and JSX children applied to a custom element as light DOM carry none. Plain-mode hosts are not stamped and report `false`; `renderRadiantElementViewToString(host, options)` returns the prepared view only, so a caller that writes the host tag itself must add `SERVER_RENDERED_HOST_ATTRIBUTE` (exported from `@ecopages/radiant/server/radiant-element-ssr`). The host removes the stamp once it has read it, as hydration markers are removed, so a connected host no longer carries it. A host inside server-rendered slotted content keeps the server's node, or comes from the slotted template with its stamp, so it reports `true`. A render-owning host in another host's view keeps its server node, state and focus when that parent hydrates, so it reports `true` too; one the parent's view rebuilds (its tag was defined only after the parent hydrated, or the server markup does not match the view) reports `false`. A page root with no binding of its own can still reconnect after such a nested host has hydrated or rendered itself, even if it updated since, when the page's static markup matches. First-connect hydration is explicit: SSR pages should import `@ecopages/radiant/client/install-hydrator` before loading component modules, or call `installRadiantHydrator()` from `@ecopages/radiant/client/hydrator` before custom elements upgrade. Without that client hydrator gate, SSR hosts fall back to a fresh client render on first connect.

Because Radiant's SSR environment shims `window` and `document`, global checks like `typeof window !== 'undefined'` or `typeof document !== 'undefined'` evaluate to `true` on the server. Guard top-level event listeners on `document` or `window` with `!isServer` from `@ecopages/radiant/is-server` so browser navigation and event listeners do not attach during SSR. This flag follows the package export condition, so it reads `true` under Node, Deno, Bun, Cloudflare Workers (`workerd`) and Vercel Edge (`edge-light`) even when a DOM shim is installed, and `false` in a browser bundle (the `browser` condition) and under any runtime that sets none of those conditions. Use a DOM capability check for code that depends on specific DOM methods.

`createResource(...)` starts from the Element Host client connect pass, after authored attributes synchronize. SSR serialization never starts resource fetches, regardless of the active package export condition. For server-rendered data, fetch before rendering and provide the value through `initialize`, `prepareHost`, or host attributes.

Server runtime setup, fragment rendering helpers, and SSR-specific import guidance live in [src/server/README.md](src/server/README.md).

For the client lifecycle and hydration flow diagram, see [src/core/README.md](src/core/README.md).

## Event Handling

Radiant does not invent a synthetic event layer. JSX handlers and decorators work with the native browser event object directly.

| Use this             | When you want                                       | Runtime shape                                                                                    |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `on:*` in JSX        | The normal event API                                | Auto-delegates a fixed allowlist of bubbling events and falls back to direct listeners otherwise |
| `on-native:*` in JSX | Exact element-level browser listener semantics      | Always calls `addEventListener(...)` on that element                                             |
| `@onEvent(...)`      | Class-level listening from `RadiantElement`         | Supports `selector`, `ref`, `window`, and `document` targets                                     |
| `@event(...)`        | A typed custom event emitter owned by the component | Dispatches a real `CustomEvent` from the host element                                            |

### How JSX Event Binding Works

`on:*` is the default JSX event API. For a fixed allowlist of bubbling events, Radiant attaches one listener per event type on the render root and dispatches to matched elements. For all other events, `on:*` attaches directly on the element.

Today the delegated allowlist is:

- `beforeinput`
- `click`
- `contextmenu`
- `dblclick`
- `focusin`
- `focusout`
- `input`
- `keydown`
- `keyup`
- `mousedown`
- `mouseout`
- `mouseover`
- `mouseup`
- `pointerdown`
- `pointerout`
- `pointerover`
- `pointerup`
- `touchend`
- `touchmove`
- `touchstart`

Use `on-native:*` when exact attachment semantics matter, such as when an ancestor may stop propagation before the delegated root listener runs or when you want to opt out of delegation for a supported bubbling event.

Events outside the allowlist, such as `focus`, `blur`, `scroll`, `load`, `invalid`, or `dragstart`, already attach directly when authored with `on:*`.

### `@onEvent(...)`

At the class level, `@onEvent(...)` is the main decorator for incoming DOM events. It can listen to:

- descendants that match a CSS selector
- descendants marked with `data-ref` that the host owns (see [Part scope](./src/core/README.md#part-scope))
- the host itself (`host: true`), including non-bubbling events such as `pointerenter` and `pointerleave`
- global `window` events
- global `document` events

```tsx
/** @jsxImportSource @ecopages/jsx */

import { RadiantElement, customElement, onEvent, state } from '@ecopages/radiant';

@customElement('keyboard-panel')
export class KeyboardPanel extends RadiantElement<{ lastKey: string }> {
	@state lastKey = 'none';

	@onEvent({ document: true, type: 'keydown' })
	protected onKeydown(event: KeyboardEvent): void {
		this.lastKey = event.key;
	}

	override render() {
		return <p>Last key: {this.$.lastKey}</p>;
	}
}
```

Selector- and ref-based `@onEvent(...)` handlers, and `subscribeEvent(...)` / `subscribeEvents(...)`, match with `Element.closest(...)` from the event target, so a click on a nested icon still reaches a wrapping `button[data-ref]` or selector match. They still rely on bubbling, so use `focusin` and `focusout` instead of `focus` and `blur` for that pattern.

Each `subscribeEvent(...)` registration is independent, including duplicate `type` and `selector` pairs. Unsubscribing one listener does not remove another, and disconnect removes every remaining registration.

### Agent tools (experimental)

The decorator and its helpers are imported from their own subpaths and are not part of the root entry, so a page that does not use them pays nothing. Browsers that implement [WebMCP](https://developer.chrome.com/docs/ai/webmcp) let a page register tools an agent calls directly, through `document.modelContext`. Radiant ties a tool to a component's lifecycle: it is registered while the host is connected and enabled and removed when the host disconnects. Where the browser has no `document.modelContext`, and on the server, nothing happens. The API is an origin trial and may change.

```ts
import { RadiantElement, customElement } from '@ecopages/radiant';
import { agentTool } from '@ecopages/radiant/decorators/agent-tool';
import type { AddItem } from './add-item';
import addItemSchema from './add-item.schema.json';

@customElement('rad-cart')
class RadCart extends RadiantElement {
	@agentTool({
		name: (host: RadCart) => `add-item-${host.id}`,
		description: 'Adds a product to the cart',
		annotations: { consequentialHint: false },
		inputSchema: addItemSchema,
	})
	async addItem(item: AddItem) {
		const response = await fetch('/api/cart', { method: 'POST', body: JSON.stringify(item) });
		if (!response.ok) throw new Error(`The cart rejected the item: ${response.status}`);
	}
}
```

| Use this                        | When you want                                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@agentTool(config)`            | A method that is both a normal method the UI calls and a tool the agent calls. The method is `execute`; the decorator leaves it callable. |
| `createAgentTool(host, config)` | The same lifecycle for a tool that is not one method, such as a controller or a field. Returns a function that stops managing the tool.   |
| `registerAgentTool(config)`     | A tool outside any host, such as a store or a page script. Returns its unregister function.                                               |

The config is the WebMCP tool dictionary passed through (`name`, `description`, `title`, `inputSchema`, `outputSchema`, `annotations`, `exposedTo`), so fields the spec adds need no Radiant release, plus:

- `parse(input: unknown)`: validates the agent's input before the method runs and throws to reject the call. A schema library's `schema.parse` works, and puts that library in the browser. Under standard decorators it also types the method's argument. Without it the input arrives unchecked, so its type is an assumption the browser does not enforce. `inputSchema` is plain JSON Schema and is advisory; Radiant ships no schema library.
- `getEnabled(host)`: registers the tool only while it returns `true`. `name` may also be a function of the host. Both are read after the host's attributes have caught up and again when a signal they read changes, which registers the tool again; the host's native `id` is not a signal, so a later change of it does not. Annotate the host parameter (`(host: RadCart) => ...`), because the decorator's config is written before TypeScript knows the class.

`inputSchema`, `outputSchema` and `parse` are read as given: JSON Schema objects and a synchronous function, so a spread copy of a config, such as `{ ...shared, getEnabled }`, runs nothing. Prefer static JSON Schema generated at build time, for example with `z.toJSONSchema`, and validation on the server the tool calls, so no schema library loads in the browser. Coming from 0.13: a schema function becomes the schema object; a getter or promise `parse` becomes a plain function or server-side validation; a getter on any other field now runs when the element is constructed.

Rules worth knowing:

- Tool names are unique per page. Two elements that use one name make the second registration reject, and Radiant reports it with `console.error` naming the tool and the element. Give each instance its own name, or register a shared capability once from whoever owns the state.
- A tool is removed only by aborting the signal it was registered with, so every connect registers with a new `AbortController`. `execute` receives `{ signal }`, which a decorated method can take as a second argument.
- Return from a method only once the UI shows the change, and set `annotations.consequentialHint` on an irreversible action and `untrustedContentHint` on output that carries user-generated content.
- A server-rendered element whose children come from its parent's view registers its tool only after it hydrates, and never when the parent does not render on the client.
- Like `@onEvent`, `@agentTool` binds the method it decorates, so a subclass override is not what the agent calls.
- In development, a tool with an empty name or description, or text over the budgets Chrome recommends (30 characters per name, 500 per description, 150 per parameter description), logs a warning once.

**Security.** A tool runs page code on behalf of an agent, with the page's cookies and DOM, and what it returns can leave the device. Radiant has no generic "read the page" tool, so a tool exposes only what its author returns. Decide these per tool:

- **Return the least.** Return only what the agent needs for the next step, never tokens, secrets or the contents of password, card or one-time-code fields. A read-only tool can still leak, such as one that returns a user's favorites. In development a tool that returns over 1,500 characters logs a warning once; nothing the agent sends or the tool returns is ever logged by Radiant.
- **Ask for the least.** A schema that asks for age, location or history lets an agent pull personal context out of the person. Ask only for what the action needs.
- **Say what it changes.** Set `readOnlyHint` for a tool that changes nothing and `consequentialHint` for a high-stakes or irreversible one, so the agent or browser can ask a person first. Annotations are optional, and in development a tool with neither hint logs a warning once. Set `untrustedContentHint` when the output carries text a user or another site wrote, because an agent may treat tool output as trusted, so it can carry a prompt injection.
- **Confirm in your own UI.** The current WebMCP spec has no confirmation API. For a consequential tool, await the app's own dialog inside `execute` and close it when `signal` aborts.
- **Validate in code, authorize on the server.** `inputSchema` is advisory and the agent can skip the validation the UI does, so check the input on the server the tool calls, and check permission there too, not only in the browser. Bind a consequential call to an id or version so a stale call is rejected.
- **Keep descriptions honest.** The name and description are read by the agent as instructions, so name side effects (a tool that finalizes a purchase is not called `finalize-cart` if it also charges a card) and keep them short.
- **Keep `exposedTo` closed.** A tool is visible only to the page's own origin unless `exposedTo` lists secure origins, and other origins then call it with arguments you cannot trust. In development a tool that sets `exposedTo` logs a warning once. A cross-origin iframe needs `allow="tools"`, and `Permissions-Policy: tools=()` turns WebMCP off for a page and its frames, which suits account and payment pages.
- **Mind the combination.** Do not put a tool that returns private data on the same page as a tool that sends data out, such as a share, a message or a form post, unless the sending one needs confirmation. This is our reasoning, not a rule from the spec.

### `@event(...)`

Outgoing component events use `@event(...)`, which gives the class a typed `EventEmitter`. Calling `.emit(detail)` dispatches a real `CustomEvent` from the host element.

```ts
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { RadiantElement, customElement, event } from '@ecopages/radiant';

type SaveDetail = {
	id: string;
};

@customElement('save-button')
export class SaveButton extends RadiantElement {
	@event({ name: 'save-requested', bubbles: true, composed: true })
	saveRequested!: EventEmitter<SaveDetail>;

	requestSave(): void {
		this.saveRequested.emit({ id: 'draft-1' });
	}
}
```

The mental model stays simple:

- DOM events come in through JSX handlers or `@onEvent(...)`
- component events go out through `@event(...)`
- both are ordinary browser events at runtime

## Development Warnings

Radiant logs development warnings when a delegated `@onEvent(...)` listener uses a non-bubbling event type, such as `focus`, when a tag is defined after a view rendered it, when a function reaches an attribute or text write (`@bindTo`, `@attr`, reflected `@prop`, server host attributes) that skips it, and when a field is bound with `this.$` and also read in `render()` or re-runs one host's `render()` 30 times within a second (see [Direct Reads And `this.$`](#direct-reads-and-this)). The warnings require both the Radiant `process.env.NODE_ENV` development gate and the shared `@ecopages/jsx` switch: `setDevWarningsEnabled(false)` silences both packages, while `true` or `undefined` enables them again. The published files keep the `process.env.NODE_ENV` check that gates them, so the app's build decides, not Radiant's: the warnings show when the bundler sets `process.env.NODE_ENV` to anything other than `"production"`, and a production build removes them along with their text. What counts as a production build depends on the bundler: esbuild sets `"production"` for a browser-platform build with minification on, Vite for `vite build` unless `NODE_ENV` says otherwise, webpack for `mode: "production"`, and Bun for `--production`. A page that loads the files without a bundler, where `process` does not exist, gets no warnings and no error.

The JSX hydration and DOM anchor warnings come from `@ecopages/jsx` and follow its own switch; see "Dev Warnings" in [the JSX README](https://github.com/ecopages/radiant/blob/main/packages/jsx/README.md#dev-warnings).

Contributors: wrap a development warning in `try { if (process.env.NODE_ENV !== 'production' && areJsxDevWarningsEnabled()) { ... } } catch {}`. The `try` keeps a page without `process` from throwing, and keeping both checks inside it lets every bundler drop the block in production; see `warnNonBubblingDelegatedEvent` in `src/helpers/create-event-listener.ts` and `setChildrenValue` in `src/core/render-runtime.ts`. `test/build/dist-dev-warnings.test.ts` fails when a built `dist` file reads `process.env.NODE_ENV` outside that shape, and bundles an app against the `dist` for development, for production, and with the check left unreplaced. `test/build/dist-dev-warnings.browser.test.ts` runs a development and a production bundle of an app in Chromium and checks which warnings reach `console.warn`. Both run in their own `node-dist` and `browser-dist` vitest projects, whose `globalSetup` (`test/build/dist-global-setup.ts`) runs only when a `test/build` file is in the run. It rebuilds `dist` with `build:lib` when the content hash of `build.ts`, `package.json`, the two `tsconfig` files, `scripts` and `src` differs from the one recorded at the last build (`node_modules/.cache/dist-source-hash`), so a whitespace edit needs no manual build. Under `CI` it never rebuilds and only requires `dist` to exist; a failed rebuild points at `pnpm --filter @ecopages/radiant build:lib`.

## Public Entry Points

These are the documented public import paths exposed by the package.

| Path                                              | Use for                                                                                                                                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@ecopages/radiant`                               | Main client entrypoint. Re-exports `RadiantElement`, `RadiantController`, reactive JSX bindings, common decorators, and controller-registry helpers such as `startControllers(...)` |
| `@ecopages/radiant/context`                       | Context-related exports as a grouped entrypoint                                                                                                                                     |
| `@ecopages/radiant/context/create-context`        | Creating context keys                                                                                                                                                               |
| `@ecopages/radiant/context/context-provider`      | Low-level context provider class                                                                                                                                                    |
| `@ecopages/radiant/context/consume-context`       | `@consumeContext(...)` decorator                                                                                                                                                    |
| `@ecopages/radiant/context/provide-context`       | `@provideContext(...)` decorator                                                                                                                                                    |
| `@ecopages/radiant/context/context-selector`      | `@contextSelector(...)` decorator — bind a field to context                                                                                                                         |
| `@ecopages/radiant/context/on-context-update`     | `@onContextUpdate(...)` decorator — run a method on context change                                                                                                                  |
| `@ecopages/radiant/context/events`                | Context request / subscription event types                                                                                                                                          |
| `@ecopages/radiant/controller-registry`           | Controller registration and activation helpers                                                                                                                                      |
| `@ecopages/radiant/core/radiant-element`          | Non-JSX reactive custom-element base                                                                                                                                                |
| `@ecopages/radiant/core/radiant-controller`       | DOM-attached controller base                                                                                                                                                        |
| `@ecopages/radiant/form-associated-element`       | `FormAssociatedElement` base for hosts that list on native `FormData`                                                                                                               |
| `@ecopages/radiant/helpers/create-query`          | `createQuery(...)`, `createQueryAll(...)`: low-level query helpers for component fields                                                                                             |
| `@ecopages/radiant/helpers/create-event`          | Low-level typed custom-event helper                                                                                                                                                 |
| `@ecopages/radiant/helpers/create-event-listener` | Low-level DOM event-listener helper                                                                                                                                                 |
| `@ecopages/radiant/helpers/create-agent-tool`     | `createAgentTool(host, ...)`: a WebMCP tool that follows a host's lifecycle (experimental)                                                                                          |
| `@ecopages/radiant/helpers/register-agent-tool`   | `registerAgentTool(...)`: registers a WebMCP tool and returns its unregister function, without a host (experimental)                                                                |
| `@ecopages/radiant/helpers/debounce`              | Debounce helper without the decorator surface                                                                                                                                       |
| `@ecopages/radiant/is-server`                     | Boolean flag (`isServer`) for branching between server and browser environments                                                                                                     |
| `@ecopages/radiant/client/hydrator`               | Explicit client hydrator installer and status helpers for SSR pages                                                                                                                 |
| `@ecopages/radiant/client/install-hydrator`       | Side-effect entrypoint that enables first-connect hydration before component modules load                                                                                           |
| `@ecopages/radiant/client/app-bootstrap`          | `prepareRadiantApp(...)` app-shell bootstrap helpers                                                                                                                                |
| `@ecopages/radiant/signals/host-resource`         | Low-level `HostResource`, `createHostResource(...)`, and `createResource(...)` helpers                                                                                              |
| `@ecopages/radiant/server/install-ssr-runtime`    | Side-effect server boot entry: light-DOM shim plus JSX SSR scope adapters                                                                                                           |
| `@ecopages/radiant/server/install-light-dom-shim` | Side-effect shim install only (prefer `install-ssr-runtime` for full Radiant SSR)                                                                                                   |
| `@ecopages/radiant/server/light-dom-shim`         | Minimal SSR window and host-preparation helpers                                                                                                                                     |
| `@ecopages/radiant/server/radiant-element-ssr`    | Lower-level host serialization (`renderRadiantElementHostToString` defaults to plain mode; see `src/server/README.md` for the full export tiers)                                    |
| `@ecopages/radiant/server/render-component`       | Canonical component SSR helpers; default hydrate mode                                                                                                                               |
| `@ecopages/radiant/server/render-controller`      | Controller-host SSR helpers and controller-specific host option types                                                                                                               |
| `@ecopages/radiant/server/project-root`           | Project-root resolution helper for server adapters                                                                                                                                  |
| `@ecopages/radiant/decorators/agent-tool`         | `@agentTool(...)` (experimental)                                                                                                                                                    |
| `@ecopages/radiant/decorators/attr`               | `@attr(...)`                                                                                                                                                                        |
| `@ecopages/radiant/decorators/bind-to`            | `@bindTo(...)`                                                                                                                                                                      |
| `@ecopages/radiant/decorators/bound`              | `@bound`                                                                                                                                                                            |
| `@ecopages/radiant/decorators/controller`         | `@controller(...)`                                                                                                                                                                  |
| `@ecopages/radiant/decorators/custom-element`     | `@customElement(...)`                                                                                                                                                               |
| `@ecopages/radiant/decorators/debounce`           | `@debounce(...)`                                                                                                                                                                    |
| `@ecopages/radiant/decorators/event`              | `@event(...)`                                                                                                                                                                       |
| `@ecopages/radiant/decorators/from-store`         | `@fromStore(...)`                                                                                                                                                                   |
| `@ecopages/radiant/decorators/on-event`           | `@onEvent(...)`                                                                                                                                                                     |
| `@ecopages/radiant/decorators/on-updated`         | `@onUpdated(...)`                                                                                                                                                                   |
| `@ecopages/radiant/decorators/prop`               | `@prop(...)`                                                                                                                                                                        |
| `@ecopages/radiant/decorators/query`              | `@query(...)`, `@queryAll(...)`                                                                                                                                                     |
| `@ecopages/radiant/decorators/ref`                | `@ref(...)`, `@refAll(...)`                                                                                                                                                         |
| `@ecopages/radiant/decorators/signal`             | `@signal(...)`                                                                                                                                                                      |
| `@ecopages/radiant/decorators/state`              | `@state`                                                                                                                                                                            |
| `@ecopages/radiant/tools/escape-script-json`      | Safe JSON-for-script serialization helper                                                                                                                                           |
| `@ecopages/radiant/tools/event-emitter`           | Low-level `EventEmitter` helper                                                                                                                                                     |

`ValueFieldDecorator`, `BoundedFieldDecorator` and the host types they name are exported from `@ecopages/radiant` (`ContextHostLike` and `ContextUpdateMethod` from `@ecopages/radiant/context`), so a library that exports a shared decorator, such as `export const count = prop({ type: Number })`, can emit declarations.

Prefer focused public subpaths when bundle size matters or when a module only needs one narrow runtime surface. The root entrypoint remains the ergonomic default for common app code, but context, registry, helper, server, signal-resource, and low-level tool imports are better taken from their explicit public subpaths.

For controller authoring, prefer a single import surface per module. If a file mixes `RadiantController`, `@controller(...)`, `@state`, `@attr(...)`, or `startControllers(...)`, default to `@ecopages/radiant` so controller registration and startup come from the same entrypoint.

Important: context APIs, controller registry helpers, helper factories, server APIs, and low-level tools have explicit public subpaths. Prefer those focused paths for library and adapter code, or when a module intentionally wants only the registry runtime without the broader client surface; the root entrypoint remains the ergonomic app entrypoint for the common client surface.

For SSR-specific guidance and examples, see [src/server/README.md](src/server/README.md).

## Bundle Size Checks

Run `pnpm run build:all` before `pnpm --filter @ecopages/radiant size:check` so the measurements use current workspace builds. The check enforces separate client and Node server budgets. The client surface excludes JSX and signals; the second client measurement includes signals while leaving JSX external, and it fails if that bundle does not include signals or is not larger than the plain client surface. The server measurements also leave JSX and signals external. `size:report` reports the same measurements without failing on an exceeded limit.
