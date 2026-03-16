# Radiant JSX

Radiant JSX adds JSX authoring to Radiant components without replacing the Radiant runtime.

Use `@ecopages/jsx` for JSX syntax, typings, and the automatic runtime entry points. Keep using `@ecopages/radiant` for the component base classes, decorators, lifecycle, and DOM update model.

[![Version](https://img.shields.io/npm/v/@ecopages/jsx.svg?style=flat-square)](https://www.npmjs.com/package/@ecopages/jsx)
[![License](https://img.shields.io/npm/l/@ecopages/jsx.svg?style=flat-square)](https://github.com/radiant/radiant/blob/main/LICENSE)

## What Ships Today

`@ecopages/jsx` currently provides:

- automatic JSX runtime entry points through `@ecopages/jsx/jsx-runtime` and `@ecopages/jsx/jsx-dev-runtime`
- intrinsic element typings for HTML and SVG tags
- plain function components
- fragment support
- direct DOM mounting with `createRoot(...).render(...)`
- native DOM event bindings with `on:*`
- explicit property bindings with `prop:*`
- boolean attribute bindings
- `data={{ ... }}` and `aria={{ ... }}` object expansion
- `class` and `className` support
- `classes` support with `clsx`/`classnames`-style merging
- array-based `class` values with falsy entries removed
- string or object-based `style` values
- a Lit-compatible template result shape

This package does not provide component state, hooks, or a standalone renderer. Those come from Radiant.

## Installation

Install both packages:

```bash
npm install @ecopages/radiant @ecopages/jsx
```

Requirements:

- TypeScript 5+
- the automatic JSX runtime enabled with `jsx: "react-jsx"`

## Setup

Configure TypeScript to use `@ecopages/jsx` as the JSX import source.

### Per File

```tsx
/** @jsxImportSource @ecopages/jsx */
```

### In tsconfig

```json
{
	"compilerOptions": {
		"jsx": "react-jsx",
		"jsxImportSource": "@ecopages/jsx"
	}
}
```

## Quick Start With Radiant

The most direct way to render JSX in a Radiant component is to extend `RadiantElementJsx`.

```tsx
/** @jsxImportSource @ecopages/jsx */
import { RadiantElementJsx, customElement, reactiveProp } from '@ecopages/radiant';

const CounterButton = ({ label, onPress }: { label: string; onPress: (event: MouseEvent) => void }) => (
	<button type="button" on:click={onPress} aria={{ label }}>
		{label}
	</button>
);

@customElement('radiant-counter')
export class RadiantCounter extends RadiantElementJsx {
	@reactiveProp({ type: Number, reflect: true, defaultValue: 0 }) count!: number;

	override connectedCallback() {
		super.connectedCallback();
		this.renderView();
	}

	private readonly increment = () => {
		this.count += 1;
		this.renderView();
	};

	private readonly decrement = () => {
		this.count -= 1;
		this.renderView();
	};

	private renderView() {
		this.render(
			<section class="counter" data={{ state: this.count > 0 ? 'active' : 'idle' }}>
				<h2>Count: {this.count}</h2>
				<div class="controls">
					<CounterButton label="Decrement" onPress={this.decrement} />
					<CounterButton label="Increment" onPress={this.increment} />
				</div>
			</section>,
		);
	}
}
```

## Mental Model

Use the packages together like this:

- `@ecopages/jsx`: JSX syntax, typings, and runtime entry points
- `@ecopages/radiant`: component classes, decorators, reactivity, and rendering into the DOM

If you remove `@ecopages/jsx`, you lose JSX authoring.
If you remove `@ecopages/radiant`, you lose the component runtime.

## Supported Authoring Patterns

### Intrinsic Elements

Standard HTML and SVG tags are typed through `JSX.IntrinsicElements`.

```tsx
const view = (
	<section>
		<h2>Status</h2>
		<svg viewBox="0 0 24 24" aria={{ hidden: true }}>
			<circle cx="12" cy="12" r="10" />
		</svg>
	</section>
);
```

### Plain Function Components

Function components are part of the runtime today. They receive props and children and return JSX values.

```tsx
type CardProps = {
	title: string;
	children?: import('@ecopages/jsx').JsxChild;
};

const Card = ({ title, children }: CardProps) => (
	<article class="card">
		<h2>{title}</h2>
		{children}
	</article>
);
```

### Fragments

Fragments work with the automatic runtime.

```tsx
const fields = (
	<>
		<label for="email">Email</label>
		<input id="email" type="email" />
	</>
);
```

### Native Events

Use `on:*` to bind native DOM listeners.

```tsx
<button on:click={this.handleClick}>Save</button>
```

The handler type is bivariant and receives an event whose `currentTarget` matches the bound element type.

### Property Bindings

Use `prop:*` when the target must receive a real property value instead of a string attribute.

```tsx
<custom-editor prop:value={draft} prop:config={editorConfig} />
```

### Boolean Attributes

Boolean values are emitted as boolean bindings.

```tsx
<button disabled={loading} hidden={collapsed}>
	{loading ? 'Saving...' : 'Save'}
</button>
```

### Structured `data-*` and `aria-*`

`data` and `aria` objects are expanded to kebab-cased attributes.

```tsx
<button
	data={{ tid: 'save-button', state: loading ? 'loading' : 'idle' }}
	aria={{ label: 'Save changes', live: 'polite' }}
/>
```

This becomes the equivalent of:

```html
<button data-tid="save-button" data-state="idle" aria-label="Save changes" aria-live="polite"></button>
```

### Classes and Styles

The runtime supports:

- `class="value"`
- `className="value"` merged into the final class list
- `classes={...}` for `clsx`-style composition across strings, arrays, object maps, and numbers
- `class={[...]}` arrays, with falsy entries removed before joining
- `style="display: grid"`
- `style={{ backgroundColor: 'white', fontSize: '14px' }}` object values, serialized to kebab-case CSS

```tsx
<section
	class={['panel', isActive && 'panel--active', compact ? 'panel--compact' : undefined]}
	classes={['surface', { interactive: true, muted: false }]}
	style={{ backgroundColor: 'white', fontSize: '14px', display: compact ? 'grid' : 'block' }}
/>
```

Object-style `style` entries with `undefined`, `null`, or `''` are omitted during serialization.

## Runtime Output

`jsx()` and `jsxs()` return a renderer-agnostic object shaped like a Lit template result.

That is why `@ecopages/jsx` can be rendered by Radiant's JSX mixin and also passes smoke tests through Lit for:

- intrinsic elements
- function component composition
- `on:*` event bindings
- `prop:*` property bindings
- boolean attributes
- `data` and `aria` expansion
- `jsxDEV` parity with the production runtime

This is a compatibility boundary, not a promise that every Lit-specific feature is supported.

## Direct Mounting

If you want to mount plain JSX directly from an application entrypoint, use the DOM root helper from `@ecopages/jsx`.

```tsx
/** @jsxImportSource @ecopages/jsx */
import { createRoot } from '@ecopages/jsx';

function DirectHandlers() {
	function handleClick() {
		console.log('Click');
	}

	const handleInput = (event: Event) => {
		console.log((event.currentTarget as HTMLInputElement).value);
	};

	return (
		<>
			<button on:click={handleClick}>Log click</button>
			<input on:input={handleInput} />
		</>
	);
}

const container = document.querySelector('#app');

if (container instanceof HTMLElement) {
	const root = createRoot(container);
	root.render(<DirectHandlers />);
}
```

This is the intended escape hatch for app-level usage that does not involve `RadiantElementJsx` or `WithJsx`.

## Exported Surface

The package exports:

- `jsx`
- `jsxs`
- `Fragment`
- types including `JsxChild`, `JsxComponent`, `JsxComponentProps`, `JsxElement`, `JsxFragment`, `JsxIntrinsicAttributes`, `JsxPrimitive`, and `TemplateResultLike`

The development runtime also exports `jsxDEV` from `@ecopages/jsx/jsx-dev-runtime` for the automatic JSX transform.

## Limitations and Current Constraints

- `@ecopages/jsx` only handles JSX authoring and template creation. It does not replace `@ecopages/radiant`.
- When rendering through Radiant's `WithJsx` or `RadiantElementJsx`, JSX templates support `insert: 'replace'` only. Other insertion modes still require string templates.
- Event bindings are native DOM listeners, not React-style synthetic events.
- There is no hook system or component-local scheduler in this package.

## Why Use It

Use `@ecopages/jsx` if you want to:

- author Radiant components with JSX instead of string templates
- compose plain function components inside Web Component render trees
- keep native DOM events and explicit property bindings visible in the template
- get typed intrinsic elements without switching away from the Radiant runtime

## Notes

- The JSX configuration is opt-in per file or per project.
- Runtime behavior is defined by the current implementation and tests, not by React conventions.
- If you need lifecycle, decorators, context, or rendering into the DOM, those remain Radiant responsibilities.
