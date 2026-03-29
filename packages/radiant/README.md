# Radiant

Radiant is a light-DOM custom element library.

It keeps browser primitives visible instead of wrapping them in a synthetic component model. You work with real custom elements, real DOM events, real attributes, and real light-DOM children. When you want JSX-backed rendering, SSR host serialization, and hydration, use `RadiantComponent`. When you want a more imperative base without JSX, use `RadiantElement`.

Radiant deliberately does not use shadow DOM by default. That makes styling, DOM inspection, and authored child content simpler, while giving up some of the encapsulation that conventional custom-element guidance usually prefers.

For the full docs site, see [radiant.ecopages.app](https://radiant.ecopages.app/).

## Installation

`@ecopages/radiant` currently expects both `@ecopages/signals` and `@ecopages/jsx` as peer dependencies.

Install all three packages:

```sh
bun install @ecopages/radiant @ecopages/signals @ecopages/jsx
```

Important: even if you are starting from `RadiantElement`, the current package surface still depends on `@ecopages/jsx`.

## RadiantComponent Mental Model

`RadiantComponent` is the structured JSX-first base class.

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

Signal and store reads performed directly inside `render()` also participate in rerender invalidation, so shared reactive data can drive `RadiantComponent` views without an extra wrapper layer.

## Counter Example

This counter shows the intended `RadiantComponent` style for stable templates: public props stay explicit, internal state stays local, and bound child values update without forcing a full rerender of the whole template.

```tsx
/** @jsxImportSource @ecopages/jsx */

import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantComponent, customElement, prop, state } from '@ecopages/radiant';

type CounterCardBindings = {
	count: number;
	label: string;
};

type CounterCardAttributes = {
	label?: string;
};

@customElement('counter-card')
export class CounterCard extends RadiantComponent<CounterCardBindings> {
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
import { RadiantComponent, onUpdated, state } from '@ecopages/radiant';

export class ResultsPanel extends RadiantComponent<{ expanded: boolean }> {
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

`RadiantComponent<Bindings>` and `RadiantElement<Bindings>` take a dedicated binding shape, not the full class type. That keeps the binding namespace limited to the reactive props or fields you want JSX to consume.

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

`RadiantComponent` has two SSR surfaces:

- `renderToString()` serializes the component view only.
- `renderHostToString()` serializes the custom-element host together with the current view.

In practice, `renderHostToString()` is the right default for full component SSR because it emits `<my-element>...</my-element>` instead of only the view fragment.

`hydrate: true` adds hydration markers for the component view. On first connect, the component checks for those markers and hydrates in place instead of doing a fresh client render.

Server runtime setup, fragment rendering helpers, and SSR-specific import guidance now live in [src/server/README.md](src/server/README.md).

For the client lifecycle and hydration flow diagram, see [src/core/README.md](src/core/README.md).

## Event Handling

Radiant does not invent a synthetic event layer. JSX handlers and decorators work with the native browser event object directly.

| Use this | When you want | Runtime shape |
| --- | --- | --- |
| `on:*` in JSX | The normal event API | Auto-delegates a fixed allowlist of bubbling events and falls back to direct listeners otherwise |
| `on-native:*` in JSX | Exact element-level browser listener semantics | Always calls `addEventListener(...)` on that element |
| `@onEvent(...)` | Class-level listening from `RadiantElement` or `RadiantComponent` | Supports `selector`, `ref`, `window`, and `document` targets |
| `@event(...)` | A typed custom event emitter owned by the component | Dispatches a real `CustomEvent` from the host element |

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

import { RadiantComponent, customElement, onEvent, state } from '@ecopages/radiant';

@customElement('keyboard-panel')
export class KeyboardPanel extends RadiantComponent<{ lastKey: string }> {
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

| Path | Use for |
| --- | --- |
| `@ecopages/radiant` | Main client entrypoint. Re-exports `RadiantElement`, `RadiantComponent`, common decorators, and context helpers |
| `@ecopages/radiant/context` | Context-related exports as a grouped entrypoint |
| `@ecopages/radiant/context/create-context` | Creating context keys |
| `@ecopages/radiant/context/context-provider` | Low-level context provider class |
| `@ecopages/radiant/context/consume-context` | `@consumeContext(...)` decorator |
| `@ecopages/radiant/context/provide-context` | `@provideContext(...)` decorator |
| `@ecopages/radiant/context/context-selector` | `@contextSelector(...)` decorator |
| `@ecopages/radiant/core/radiant-element` | Non-JSX reactive custom-element base |
| `@ecopages/radiant/core/radiant-component` | JSX-first component base |
| `@ecopages/radiant/server/light-dom-shim` | Minimal SSR window and host-preparation helpers |
| `@ecopages/radiant/server/render-component` | Canonical component SSR helpers and metadata utilities |
| `@ecopages/radiant/server/project-root` | Project-root resolution helper for server adapters |
| `@ecopages/radiant/decorators/bound` | `@bound` |
| `@ecopages/radiant/decorators/custom-element` | `@customElement(...)` |
| `@ecopages/radiant/decorators/debounce` | `@debounce(...)` |
| `@ecopages/radiant/decorators/event` | `@event(...)` |
| `@ecopages/radiant/decorators/on-event` | `@onEvent(...)` |
| `@ecopages/radiant/decorators/on-updated` | `@onUpdated(...)` |
| `@ecopages/radiant/decorators/prop` | `@prop(...)` |
| `@ecopages/radiant/decorators/query` | `@query(...)` |
| `@ecopages/radiant/decorators/query-slot` | `@querySlot(...)` |
| `@ecopages/radiant/decorators/reactive-field` | `@reactiveField` |
| `@ecopages/radiant/decorators/reactive-prop` | `@reactiveProp(...)` |
| `@ecopages/radiant/decorators/signal` | `@signal(...)` |
| `@ecopages/radiant/decorators/state` | `@state` |
| `@ecopages/radiant/tools/stringify-typed` | Typed attribute serialization helper |
| `@ecopages/radiant/tools/render-jsx-template` | Render a JSX template result into an existing host |
| `@ecopages/radiant/tools/escape-script-json` | Safe JSON-for-script serialization helper |
| `@ecopages/radiant/tools/event-emitter` | Low-level `EventEmitter` helper |

Import component bases, decorators, and context helpers from the root entrypoint. Import server and low-level tool helpers from their explicit public subpaths.

For SSR-specific guidance and examples, see [src/server/README.md](src/server/README.md).
