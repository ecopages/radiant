# Radiant

Radiant is a light-DOM platform for custom elements and DOM-attached controllers.

It keeps browser primitives visible instead of wrapping them in a synthetic component model. You work with real custom elements, real DOM events, real attributes, and real light-DOM children. Use `RadiantElement` when you want reactive fields, JSX-backed rendering, SSR host serialization, and hydration on a real custom element. Use `RadiantController` when you want behavior attached to existing DOM instead of defining a custom element.

Radiant deliberately does not use shadow DOM by default. That makes styling, DOM inspection, and authored child content simpler, while giving up some of the encapsulation that conventional custom-element guidance usually prefers.

For the full docs site, see [radiant.ecopages.app](https://radiant.ecopages.app/).

## Installation

`@ecopages/radiant` is the core package. `@ecopages/jsx` provides TSX rendering, and `@ecopages/signals` provides the renderer-agnostic reactive layer underneath Radiant.

`@ecopages/radiant` depends on `@ecopages/signals` directly and declares `@ecopages/jsx` as a peer dependency. Installing radiant brings signals transitively, which also satisfies jsx's peer dependency on signals.

For the standard Radiant setup, install radiant and jsx:

```sh
bun add @ecopages/radiant @ecopages/jsx
```

Application code does not need to import JSX helpers or Signals primitives directly for every feature, but the current published Radiant surface expects `@ecopages/jsx` to be installed alongside it. Install `@ecopages/signals` explicitly only when you want the standalone reactive layer outside Radiant, or when using `@ecopages/jsx` without radiant.

## RadiantElement Mental Model

`RadiantElement` is the structured base class for reactive custom elements.

- `render()` returns the current JSX view.
- First connect automatically chooses between hydration and a fresh client render.
- `update()` reruns `render()` and commits the current view into the host immediately.
- `requestUpdate()` schedules one rerender in a microtask and coalesces repeated requests.
- `@prop(...)`, `@state`, and `@signal(...)` define reactive members.
- `@onUpdated(...)` is the bridge from reactive member changes to `update()` or `requestUpdate()` when the rendered structure needs to be recomputed.
- `this.bindings.key`, `this.$.key`, and `this.bind('key')` expose stable JSX bindings for reactive members.
- If `render()` is omitted, the base implementation behaves like `<slot />`, so authored light-DOM children pass through unchanged.
- Literal `<slot>` tags project authored light-DOM content, and `getSlotElement(...)`, `getSlotElements(...)`, or `@querySlot(...)` let component logic read the assigned elements.

The key distinction is this:

- Use bindings such as `this.$.count` when the shape of the view stays the same and only child values need to change.
- Use `update()` or `requestUpdate()` when a reactive change affects the structure of the JSX tree.

Signal and store reads performed directly inside `render()` also participate in rerender invalidation, so shared reactive data can drive `RadiantElement` views without an extra wrapper layer.

## Counter Example

This counter shows the intended `RadiantElement` style for stable templates: public props stay explicit, internal state stays local, and bound child values update without forcing a full rerender of the whole template.

```tsx
/** @jsxImportSource @ecopages/jsx */

import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, prop, state } from '@ecopages/radiant';

type CounterCardBindings = {
	count: number;
	label: string;
};

type CounterCardAttributes = {
	label?: string;
};

@customElement('counter-card')
export class CounterCard extends RadiantElement<CounterCardBindings> {
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

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'counter-card': JsxCustomElementAttributes<HTMLElement, CounterCardAttributes>;
	}
}
```

How this works:

- `@prop(...)` makes `label` part of the component's public reactive property and attribute surface.
- `@state` is internal mutable state.
- `this.$.label` and `this.$.count` are cached JSX bindings, so those text positions can update directly when the underlying reactive members change.
- This example does not call `update()` because the view structure is stable. Only the bound child values change.
- The JSX intrinsic-element declaration uses a public attribute type that is narrower than the internal binding shape. That is usually the right split.

If the same type truly represents both internal bindings and public JSX attributes, you can reuse it for both. Otherwise, keep those contracts separate.

### When To Call `update()`

Call `update()` or `requestUpdate()` when a reactive change affects which elements should exist, not just their child values.

```ts
import { RadiantElement, onUpdated, state } from '@ecopages/radiant';

export class ResultsPanel extends RadiantElement<{ expanded: boolean }> {
	@state expanded = false;

	@onUpdated('expanded')
	protected rerenderView(): void {
		this.requestUpdate();
	}
}
```

Use `update()` when you want the rerender immediately. Use `requestUpdate()` when several changes may happen in the same turn and one final rerender is enough.

## Reactive JSX Bindings

Bindings are the non-obvious part of the API, and they are worth being explicit about.

`RadiantElement<Bindings>` takes a dedicated binding shape, not the full class type. That keeps the binding namespace limited to the reactive props or fields you want JSX to consume.

These three forms are equivalent:

- `this.bindings.count`
- `this.$.count`
- `this.bind('count')`

They all resolve through the same cached binding object.

Use bindings when:

- the rendered element structure stays the same
- only text, attribute, or child-value positions need to change
- you want the renderer to patch the owned child range instead of rerunning the whole component view

Use `@onUpdated(...)` with `update()` or `requestUpdate()` when the reactive change should rebuild the JSX tree.

## SSR And Hydration

Prefer the server pipeline for host HTML:

- import `@ecopages/radiant/server/install-ssr-runtime` once at server boot (shim + ALS scope adapters)
- `renderComponent(...)` / `renderComponentToString(...)` from `@ecopages/radiant/server/render-component` for adapters and fragments
- `renderRadiantElementHostToString(...)` from `@ecopages/radiant/server/radiant-element-ssr` for lower-level host serialization
- `renderViewToString()` on the element only serializes the JSX view through the installed server runtime

There is no durable Element Host instance API named `renderHostToString()`.

Radiant SSR is light-DOM only. Shadow `renderRootMode` hosts throw during server serialization; client shadow rendering remains valid.

`mode: 'hydrate'` adds hydration markers for the component view. First-connect hydration is explicit: SSR pages should import `@ecopages/radiant/client/install-hydrator` before loading component modules, or call `installRadiantHydrator()` from `@ecopages/radiant/client/hydrator` before custom elements upgrade. Without that client hydrator gate, SSR hosts fall back to a fresh client render on first connect.

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
- descendants marked with `data-ref`
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

Important: `@onEvent({ selector: ... })` and `@onEvent({ ref: ... })` currently check `event.target.matches(...)` directly. That means matching is strict against the original target, not ancestor-aware. If a nested element inside a button receives the click, the nested element must match for the handler to run.

Also note that selector- and ref-based `@onEvent(...)` handlers rely on bubbling. Use `focusin` and `focusout` instead of `focus` and `blur` for that pattern.

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
| `@ecopages/radiant/helpers/create-query`          | Low-level query helper for component fields                                                                                                                                         |
| `@ecopages/radiant/helpers/create-query-slot`     | Low-level slot query helper for component fields                                                                                                                                    |
| `@ecopages/radiant/helpers/create-event`          | Low-level typed custom-event helper                                                                                                                                                 |
| `@ecopages/radiant/helpers/create-event-listener` | Low-level DOM event-listener helper                                                                                                                                                 |
| `@ecopages/radiant/helpers/debounce`              | Debounce helper without the decorator surface                                                                                                                                       |
| `@ecopages/radiant/client/hydrator`               | Explicit client hydrator installer and status helpers for SSR pages                                                                                                                 |
| `@ecopages/radiant/client/install-hydrator`       | Side-effect entrypoint that enables first-connect hydration before component modules load                                                                                           |
| `@ecopages/radiant/client/app-bootstrap`          | `prepareRadiantApp(...)` app-shell bootstrap helpers                                                                                                                                |
| `@ecopages/radiant/signals/host-resource`         | Low-level `HostResource`, `createHostResource(...)`, and `createResource(...)` helpers                                                                                              |
| `@ecopages/radiant/server/install-ssr-runtime`    | Side-effect server boot entry: light-DOM shim plus JSX SSR scope adapters                                                                                                           |
| `@ecopages/radiant/server/install-light-dom-shim` | Side-effect shim install only (prefer `install-ssr-runtime` for full Radiant SSR)                                                                                                   |
| `@ecopages/radiant/server/light-dom-shim`         | Minimal SSR window and host-preparation helpers                                                                                                                                     |
| `@ecopages/radiant/server/radiant-element-ssr`    | Lower-level host serialization (`renderRadiantElementHostToString`; see `src/server/README.md` for the full export tiers)                                                           |
| `@ecopages/radiant/server/render-component`       | Canonical component SSR helpers and shared fragment metadata utilities                                                                                                              |
| `@ecopages/radiant/server/render-controller`      | Controller-host SSR helpers and controller-specific host option types                                                                                                               |
| `@ecopages/radiant/server/project-root`           | Project-root resolution helper for server adapters                                                                                                                                  |
| `@ecopages/radiant/decorators/attr`               | `@attr(...)`                                                                                                                                                                        |
| `@ecopages/radiant/decorators/bound`              | `@bound`                                                                                                                                                                            |
| `@ecopages/radiant/decorators/controller`         | `@controller(...)`                                                                                                                                                                  |
| `@ecopages/radiant/decorators/custom-element`     | `@customElement(...)`                                                                                                                                                               |
| `@ecopages/radiant/decorators/debounce`           | `@debounce(...)`                                                                                                                                                                    |
| `@ecopages/radiant/decorators/event`              | `@event(...)`                                                                                                                                                                       |
| `@ecopages/radiant/decorators/on-event`           | `@onEvent(...)`                                                                                                                                                                     |
| `@ecopages/radiant/decorators/on-updated`         | `@onUpdated(...)`                                                                                                                                                                   |
| `@ecopages/radiant/decorators/prop`               | `@prop(...)`                                                                                                                                                                        |
| `@ecopages/radiant/decorators/query`              | `@query(...)`                                                                                                                                                                       |
| `@ecopages/radiant/decorators/query-slot`         | `@querySlot(...)`                                                                                                                                                                   |
| `@ecopages/radiant/decorators/signal`             | `@signal(...)`                                                                                                                                                                      |
| `@ecopages/radiant/decorators/state`              | `@state`                                                                                                                                                                            |
| `@ecopages/radiant/tools/escape-script-json`      | Safe JSON-for-script serialization helper                                                                                                                                           |
| `@ecopages/radiant/tools/event-emitter`           | Low-level `EventEmitter` helper                                                                                                                                                     |

Prefer focused public subpaths when bundle size matters or when a module only needs one narrow runtime surface. The root entrypoint remains the ergonomic default for common app code, but context, registry, helper, server, signal-resource, and low-level tool imports are better taken from their explicit public subpaths.

For controller authoring, prefer a single import surface per module. If a file mixes `RadiantController`, `@controller(...)`, `@state`, `@attr(...)`, or `startControllers(...)`, default to `@ecopages/radiant` so controller registration and startup come from the same entrypoint.

Important: context APIs, controller registry helpers, helper factories, server APIs, and low-level tools have explicit public subpaths. Prefer those focused paths for library and adapter code, or when a module intentionally wants only the registry runtime without the broader client surface; the root entrypoint remains the ergonomic app entrypoint for the common client surface.

For SSR-specific guidance and examples, see [src/server/README.md](src/server/README.md).
