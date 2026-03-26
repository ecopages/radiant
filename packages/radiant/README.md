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

```ts
// server/install-radiant-ssr.ts
import { installLightDomShim } from '@ecopages/radiant/server/light-dom-shim';

installLightDomShim();

// server/entry.ts
import './install-radiant-ssr';
import '../components/counter-card';
```

For the full lifecycle and SSR flow diagram, see [src/core/README.md](src/core/README.md).

## Import Structure

| Folder/Module                 | Description                             |
| ----------------------------- | --------------------------------------- |
| `./`                          | Contains all modules.                   |
| `./context`                   | Contains all modules related to contex. |
| `./context/create-context`    | Module for creating context.            |
| `./context/context-provider`  | Module for providing context.           |
| `./context/consume-context`   | Module for consuming context.           |
| `./context/provide-context`   | Module for providing context.           |
| `./context/context-selector`  | Module for selecting context.           |
| `./core`                      | Contains all core elements              |
| `./core/radiant-element`      | Module for the Radiant Element.         |
| `./core/radiant-component`    | Module for the JSX-first Radiant base.  |
| `./decorators`                | Contains decorator modules.             |
| `./decorators/custom-element` | Decorator for custom elements.          |
| `./decorators/event`          | Decorator for events.                   |
| `./decorators/on-event`       | Decorator for event handlers.           |
| `./decorators/on-updated`     | Decorator for update handlers.          |
| `./decorators/prop`           | Decorator for public reactive props.    |
| `./decorators/query`          | Decorator for querying elements.        |
| `./decorators/state`          | Decorator for internal reactive state.  |
| `./decorators/reactive-field` | Decorator for reactive fields.          |
| `./decorators/reactive-prop`  | Decorator for reactive properties.      |
| `./tools`                     | Contains utility modules.               |
| `./tools/stringify-typed`     | Utility for stringifying attributes.    |
| `./tools/event-emitter`       | Utility for emitting events.            |
| `./utils`                     | Contains additional utility modules.    |
