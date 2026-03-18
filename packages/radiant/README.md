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
- `renderHost()` and `renderHostToString()` let the component own its host-aware SSR output

```tsx
/** @jsxImportSource @ecopages/jsx */

import { RadiantComponent, customElement, onUpdated, reactiveProp } from '@ecopages/radiant';

@customElement('counter-card')
export class CounterCard extends RadiantComponent {
	@reactiveProp({ type: Number, reflect: true, defaultValue: 0 }) count!: number;
	@reactiveProp({ type: String, defaultValue: 'Counter' }) label!: string;

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
				<h2>{this.label}</h2>
				<p>Count: {this.count}</p>
				<button type="button" on:click={this.increment}>
					Increment
				</button>
			</section>
		);
	}
}
```

`renderToString({ hydrate: true })` emits hydration markers for the component view only.
`renderHostToString({ hydrate: true })` emits the custom-element host plus the component view, so SSR no longer needs to manually wrap `render()` output.
The component will hydrate that SSR DOM on first connect.
For the full lifecycle and SSR flow diagram, see [src/core/README.md](src/core/README.md).

Use `RadiantElementJsx` when you want a Radiant base class with JSX rendering built in.
`render()` is the JSX-first API. `renderTemplate()` remains available as the lower-level compatibility hook.

```tsx
/** @jsxImportSource @ecopages/jsx */

import { RadiantElementJsx } from '@ecopages/radiant';

export class HelloCard extends RadiantElementJsx {
	override connectedCallback() {
		super.connectedCallback();
		this.render(
			<div>
				<h1>Hello</h1>
				<p>Radiant JSX</p>
			</div>,
		);
	}
}
```

For composition-based usage, import `WithJsx` from `@ecopages/radiant/mixins/with-jsx`.

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
| `./core/radiant-element-jsx`  | Module for the JSX-aware Radiant base.  |
| `./decorators`                | Contains decorator modules.             |
| `./decorators/custom-element` | Decorator for custom elements.          |
| `./decorators/event`          | Decorator for events.                   |
| `./decorators/on-event`       | Decorator for event handlers.           |
| `./decorators/on-updated`     | Decorator for update handlers.          |
| `./decorators/query`          | Decorator for querying elements.        |
| `./decorators/reactive-field` | Decorator for reactive fields.          |
| `./decorators/reactive-prop`  | Decorator for reactive properties.      |
| `./mixins`                    | Contains mixin modules.                 |
| `./mixins/with-kita`          | Mixin for Kita functionality.           |
| `./mixins/with-jsx`           | Mixin for JSX functionality.            |
| `./tools`                     | Contains utility modules.               |
| `./tools/stringify-typed`     | Utility for stringifying attributes.    |
| `./tools/event-emitter`       | Utility for emitting events.            |
| `./utils`                     | Contains additional utility modules.    |
