# Radiant

Radiant is a minimalist web component library designed for simplicity and flexibility.

It leverages the light DOM, allowing components to be styled and manipulated with standard CSS and JavaScript, unlike traditional web components that use the shadow DOM.

This approach deviates from conventional [web component best practices](https://web.dev/articles/custom-elements-best-practices), offering a trade-off for a more streamlined development experience.

Ideal for any kind of projects, Radiant provides a lightweight alternative to full web components implementations, reducing unnecessary overhead.

For more details, [see the docs page](https://radiant.ecopages.app/).

## How to install it

```sh
bun install @ecopages/radiant
```

To author components with automatic JSX runtime support, install `@ecopages/jsx` as well.

```sh
bun install @ecopages/radiant @ecopages/jsx
```

## JSX Integration

`RadiantComponent` is the current structured JSX-first base class.
It keeps rerenders explicit:

- `render()` returns JSX directly
- `update()` is the single rerender entrypoint
- `@onUpdated(...)` can be used to declare which reactive fields or props should call `update()`
- first connect can either hydrate existing light-DOM SSR markup or do a fresh client render
- literal `<slot>` tags project authored light-DOM children into default and named insertion points
- `renderHost()` and `renderHostToString()` let the component own its host-aware SSR output

```tsx
/** @jsxImportSource @ecopages/jsx */

import { RadiantComponent, customElement, onUpdated, prop } from '@ecopages/radiant';

type CounterCardBindings = {
	count: number;
	label: string;
};

@customElement('counter-card')
export class CounterCard extends RadiantComponent<CounterCardBindings> {
	@prop({ type: Number, reflect: true, defaultValue: 0 }) count!: number;
	@prop({ type: String, defaultValue: 'Counter' }) label!: string;

	@onUpdated(['count', 'label'])
	override update(): void {
		super.update();
	}

	private readonly increment = () => {
		this.count += 1;
	};

	override render() {
		return (
			<section>
				<slot name="heading">
					<h2>{this.bindings.label}</h2>
				</slot>
				<p>Count: {this.$.count}</p>
				<slot />
				<button type="button" on:click={this.increment}>
					Increment
				</button>
			</section>
		);
	}
}
```

When you use reactive JSX bindings, pass a dedicated binding shape to
`RadiantComponent<...>` or `RadiantElement<...>` instead of the whole class type.
That keeps binding keys limited to the reactive props or state you want JSX to
accept.

Use `this.bindings.key` for the explicit form or `this.$.key` for the short form.
Both aliases resolve through the same cached binding objects as `bind('key')`.

When the same shape also represents the component's public JSX attributes, you
can reuse it in a custom element declaration via
`JsxCustomElementAttributes<HTMLElement, Shape>` from `@ecopages/jsx`.

```ts
import type { JsxCustomElementAttributes } from '@ecopages/jsx';

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'counter-card': JsxCustomElementAttributes<HTMLElement, CounterCardBindings>;
	}
}
```

`renderToString({ hydrate: true })` emits hydration markers for the component view only.
`renderHostToString({ hydrate: true })` emits the custom-element host plus the component view, so SSR no longer needs to manually wrap `render()` output.
The component will hydrate that SSR DOM on first connect.
When a component uses literal `<slot>` tags, `renderHostToString()` also embeds the slot-projection payload needed to reconstruct default and named assignments on the client.
When an SSR runtime does not provide `HTMLElement` or `customElements`, install the light-DOM shim before importing Radiant component modules.

For framework adapters that need to ship SSR fragments together with lazy hydration metadata, Radiant also exposes reusable server primitives from `@ecopages/radiant/server/render-component`.

```ts
import {
	createRenderedComponentHeaders,
	renderComponent,
	toRenderedComponentPayload,
} from '@ecopages/radiant/server/render-component';

import { createServerRenderEnvironment } from '@ecopages/radiant/server/light-dom-shim';

const environment = createServerRenderEnvironment();

const rendered = await renderComponent({
	component: CounterCard,
	prepareHost: (host) => {
		host.insertAdjacentHTML('beforeend', '<p>Server projected content</p>');
	},
	configure: (component) => {
		component.count = 4;
	},
	clientModuleSrc: '/components/counter-card.js',
	environment,
});

const payload = toRenderedComponentPayload(rendered);
const headers = createRenderedComponentHeaders(rendered.metadata);
```

```ts
const themedRender = await renderComponent({
	component: ContextAwareCard,
	ssrContext: [{ context: themeContext, value: { mode: 'studio' } }],
});
```

`renderComponent()` returns the canonical render result with transport-agnostic metadata plus a JSX-compatible preview node for larger server-rendered page shells.
`toRenderedComponentPayload()` converts that result into the flat payload shape that simple JSON or HTML fragment endpoints may prefer.
`createServerRenderEnvironment()` gives adapters a single host-preparation entrypoint backed by the installed SSR shim.
`prepareHost(...)` is the dedicated way to materialize authored light-DOM nodes before `querySlot()` and slot projection run during SSR.
`authoredContent` remains the short form when the authored light DOM already exists as an HTML string.
`ssrContext` lets standalone fragment renders consume parent-like context values during SSR without needing a real provider host.
The shim is intentionally not a full DOM implementation; it only supports the host preparation and serialization surface used by component-aware SSR.
All helpers infer the custom-element tag name from `@customElement(...)` metadata automatically unless you override it.
When the framework adapter can derive the client module URL on its own, you can pass the component constructor directly and let `resolveClientModuleSrc(...)` fill that in automatically.

```ts
// server/install-radiant-ssr.ts
import { installLightDomShim } from '@ecopages/radiant/server/light-dom-shim';

installLightDomShim();

// server/entry.ts
import './install-radiant-ssr';
import '../components/counter-card';
```

For the full lifecycle and SSR flow diagram, see [src/core/README.md](src/core/README.md).

## Event Handling

The browser already gives you a solid event model. An interaction starts on one node, that node becomes `event.target`, and then the event may travel through the tree. When a handler runs, `event.currentTarget` is the element whose listener is active at that moment. If an event bubbles, a parent can react to something that started in a child without every child owning its own listener.

That is the foundation for every event API in Radiant. Radiant does not invent a synthetic event layer. It uses the browser event object directly and then offers a few different ways to attach or emit events depending on the level you are working at.

| Use this               | When you want                                                       | Notes                                                        |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| `on:*` in JSX          | A native listener on the rendered element                           | Best default when you want exact browser semantics           |
| `on-delegate:*` in JSX | Fewer listeners for common bubbling interactions                    | Root-scoped delegation for the JSX render tree               |
| `@onEvent(...)`        | Class-level listening from a `RadiantElement` or `RadiantComponent` | Supports `selector`, `ref`, `window`, and `document` targets |
| `@event(...)`          | A typed custom event emitter owned by the component                 | Emits a real `CustomEvent` from the host element             |

### How Radiant Listens

Inside JSX, `on:*` attaches a native DOM listener to the element itself. `on-delegate:*` opts into root-scoped delegation for a curated set of bubbling events. That makes repeated interactive UI cheaper to mount without changing the event object into a framework-specific wrapper.

At the class level, `@onEvent(...)` is the main decorator for incoming events. It can listen to:

- descendants that match a CSS selector
- descendants marked with `data-ref`
- global `window` events
- global `document` events

```tsx
/** @jsxImportSource @ecopages/jsx */

import { RadiantComponent, customElement, onEvent } from '@ecopages/radiant';

@customElement('keyboard-panel')
export class KeyboardPanel extends RadiantComponent {
	private lastKey = '';

	@onEvent({ document: true, type: 'keydown' })
	onKeydown(event: KeyboardEvent) {
		this.lastKey = event.key;
		this.update();
	}

	override render() {
		return <p>Last key: {this.lastKey || 'none'}</p>;
	}
}
```

Important: `@onEvent({ selector: ... })` and `@onEvent({ ref: ... })` rely on bubbling. Today that decorator path checks `event.target.matches(...)` directly on the bubbling event, so the match is strict. If you click a nested node inside a button, the nested node must match the selector for the handler to run. For `focus` and `blur`, use `focusin` and `focusout` instead because the native `focus` and `blur` events do not bubble.

### How Radiant Emits

Outgoing events use `@event(...)`, which gives the class a typed `EventEmitter`. Calling `.emit(detail)` dispatches a real `CustomEvent` from the host element.

```ts
import { type EventEmitter, RadiantElement, customElement, event } from '@ecopages/radiant';

type SaveDetail = {
	id: string;
};

@customElement('save-button')
export class SaveButton extends RadiantElement {
	@event({ name: 'save-requested', bubbles: true, composed: true })
	saveRequested!: EventEmitter<SaveDetail>;

	requestSave() {
		this.saveRequested.emit({ id: 'draft-1' });
	}
}
```

This separation keeps the mental model clean:

- DOM events come in through JSX handlers or `@onEvent(...)`
- component events go out through `@event(...)`
- both are still ordinary browser events at runtime

## Import Structure

| Folder/Module                 | Description                                         |
| ----------------------------- | --------------------------------------------------- |
| `./`                          | Contains all modules.                               |
| `./context`                   | Contains all modules related to contex.             |
| `./context/create-context`    | Module for creating context.                        |
| `./context/context-provider`  | Module for providing context.                       |
| `./context/consume-context`   | Module for consuming context.                       |
| `./context/provide-context`   | Module for providing context.                       |
| `./context/context-selector`  | Module for selecting context.                       |
| `./core`                      | Contains all core elements                          |
| `./core/radiant-element`      | Module for the Radiant Element.                     |
| `./core/radiant-component`    | Module for the JSX-first Radiant base.              |
| `./server/light-dom-shim`     | Minimal SSR window and host preparation helpers.    |
| `./server/render-component`   | Canonical component SSR helpers and metadata.       |
| `./server/project-root`       | Project-root resolution helper for server adapters. |
| `./decorators`                | Contains decorator modules.                         |
| `./decorators/custom-element` | Decorator for custom elements.                      |
| `./decorators/event`          | Decorator for events.                               |
| `./decorators/on-event`       | Decorator for event handlers.                       |
| `./decorators/on-updated`     | Decorator for update handlers.                      |
| `./decorators/prop`           | Decorator for public reactive props.                |
| `./decorators/query`          | Decorator for querying elements.                    |
| `./decorators/state`          | Decorator for internal reactive state.              |
| `./decorators/reactive-field` | Decorator for reactive fields.                      |
| `./decorators/reactive-prop`  | Decorator for reactive properties.                  |
| `./tools`                     | Contains utility modules.                           |
| `./tools/stringify-typed`     | Utility for stringifying attributes.                |
| `./tools/event-emitter`       | Utility for emitting events.                        |
| `./utils`                     | Contains additional utility modules.                |
