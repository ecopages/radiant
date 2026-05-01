# PRD: Reactive Host and Controller Mode for Radiant

## Status

Draft

## Summary

Radiant should grow from a custom-element-first library into a reactive host system with two public host models:

- `RadiantElement` for Web Components and JSX-first rendering
- `RadiantController` for Stimulus-like DOM controllers

Both host models should share the same reactivity, decorator semantics where possible, and JSX integration model.

The core product decision is to extract the non-DOM-specific reactive machinery into an internal `ReactiveHost` base and build the current custom-element behavior on top of it instead of making custom-element registration optional on the existing class.

`RadiantComponent` should be removed in this release. It should not ship as a deprecated alias, compatibility layer, or parallel public concept.

This proposal also introduces a clearer separation between:

- `data-*` attributes as the controller-facing HTML transport layer
- `prop(...)` as a host property and JSX power feature
- a new `attr(...)` decorator for direct attribute reads that do not imply full prop semantics

## Problem

Radiant currently assumes that the main host abstraction is a custom element.

That assumption is visible in the current implementation:

- `RadiantElement` resolves its base from `HTMLElement` and cannot exist without it.
- `RadiantComponent` is tightly coupled to custom-element lifecycle, host rendering, hydration, and slot projection.
- `@customElement(...)` only controls registration, not the runtime host model.
- `@prop(...)` is currently the only attribute-backed reactive input abstraction.

This prevents Radiant from supporting a Stimulus-like controller model without either:

- overloading the current custom-element model with unrelated behavior, or
- extracting the actual reusable primitive that already exists inside the implementation: host-local reactivity.

At the same time, the current input model conflates three concerns that should be distinct:

1. HTML-authored `data-*` configuration
2. generic attribute reads
3. rich property semantics used by JSX and imperative consumers

It also exposes too many public element-side concepts:

1. `RadiantElement` as the reactive DOM host base
2. `RadiantComponent` as the JSX-first rendering base
3. a future `RadiantController` if controller mode is added

That three-class public story is heavier than necessary.

## Opportunity

Radiant already has a strong reactive substrate:

- tracked reactive reads
- update callbacks
- lifecycle-bound cleanup hooks
- signal-backed host state
- JSX binding integration

Those capabilities are useful outside custom elements. A controller mode would let users apply Radiant's reactivity and decorators to existing server-rendered or framework-generated DOM without forcing custom-element adoption.

This would make Radiant viable for:

- progressive enhancement on existing HTML
- SSR-first applications that want controller behavior without defining custom elements
- teams already familiar with Stimulus-style controller registries
- mixed codebases where some surfaces benefit from custom elements and others do not

## Goals

1. Introduce a public controller mode that feels native to Radiant, not bolted on.
2. Preserve one shared reactive mental model across custom elements and controllers.
3. Keep HTML-authored controller configuration based on `data-*` attributes.
4. Preserve a strong `prop(...)` concept for JSX and imperative property-driven usage.
5. Add an explicit `attr(...)` decorator for attribute-backed input without prop behavior.
6. Keep the public surface small and predictable.
7. Keep migration straightforward for existing `RadiantComponent` users by making `RadiantElement` the direct replacement.
8. Delete `RadiantComponent` in this release instead of carrying a deprecation layer.

## Non-Goals

1. Replace the current custom-element model.
2. Make every existing decorator work on every possible host.
3. Rebuild all SSR and hydration infrastructure in the first phase.
4. Support arbitrary host objects with no DOM element backing.
5. Add a second parallel JSX system.

## Users and Use Cases

### User A: Web Component Author

Uses `RadiantComponent` or `RadiantElement` today and wants a clear migration path with less public surface afterwards.

### User B: Progressive Enhancement Author

Wants Stimulus-like controllers attached to existing markup, using `data-*` attributes for authored configuration.

### User C: JSX-Heavy Application Author

Wants property-based composition because JSX can pass rich values, callbacks, signals, and objects that do not fit attribute serialization.

## Current Constraints

The current codebase implies the following architectural constraints:

- `RadiantElement` is `HTMLElement`-based and owns attribute reflection, event dispatch, DOM querying, and host lifecycle.
- `RadiantComponent` adds render scheduling, light-DOM rendering, hydration, SSR host serialization, and slot projection.
- `@state(...)` and `@signal(...)` mostly rely on host-local reactive capabilities.
- `@prop(...)` depends on attribute-backed property semantics.
- `@query(...)` and `@querySlot(...)` assume a DOM element host.

These constraints support a shared reactive core, but they do not support reusing the exact same public class for both custom elements and controllers.

They do, however, support collapsing the two public custom-element bases into one if the render and hydration behavior becomes the default element experience.

## Product Decision

Radiant should introduce an internal `ReactiveHost` abstraction and keep only two public host classes: `RadiantElement` and `RadiantController`.

The preferred architecture is:

1. `ReactiveHost` as the internal reactivity and lifecycle base.
2. `RadiantElement` extends `HTMLElement`, composes or extends `ReactiveHost`, and absorbs the current `RadiantComponent` rendering model.
3. `RadiantController` wraps a normal `Element` and reuses `ReactiveHost` semantics.
4. `RadiantComponent` does not become the controller and should be deleted as part of this release.

This is preferred over `@customElement(name, { pure: true })` because controller mode is not just registration without registration. It is a different attachment model, different discovery model, and different HTML contract.

This is also preferred over keeping all three public classes because the element-side distinction is implementation-driven more than product-driven. From a user perspective, one Web Component base and one controller base is easier to explain.

## Concrete API Draft

This section defines the intended public and internal API shape closely enough to guide implementation.

### Internal: `ReactiveHost`

`ReactiveHost` is internal infrastructure. It is not exported from the package root.

Illustrative shape:

```ts
abstract class ReactiveHost<Bindings extends object = {}> {
	readonly bindings: ReactiveBindings<Bindings>;
	readonly $: ReactiveBindings<Bindings>;

	protected abstract isHostConnected(): boolean;
	protected shouldAutoBindReactiveMembers(): boolean;

	connectHost(): void;
	disconnectHost(): void;

	registerConnectedCallback(callback: () => void): void;
	registerCleanupCallback(callback: () => void): void;

	registerUpdateCallback(property: string, update: () => void): () => void;
	notifyUpdate(property: string, oldValue: unknown, value: unknown): void;
	trackReactiveRead(property: string): void;

	bind<Property extends keyof Bindings & string>(property: Property): SubscribableJsxValue<Bindings[Property]>;
	getReactiveBinding<Property extends keyof Bindings & string>(
		property: Property,
	): SubscribableJsxValue<Bindings[Property]>;

	defineReactiveBinding(property: string, bind?: ReactiveBindingOption): void;
	registerReactiveDependencyReader(property: string, read: () => unknown): void;

	createReactiveField<T>(property: string, initialValue: T, options?: ReactiveFieldOptions): void;
	createReactiveProp<T>(property: string, options: ReactivePropertyOptions<T>): void;
	createReactiveAttribute(property: string, options?: ReactiveAttributeOptions): void;

	requestUpdate(): void;
	update(): void;
}
```

Notes:

- `ReactiveHost` owns reactivity and update scheduling hooks.
- DOM concerns stay in `RadiantElement` and `RadiantController`.
- `requestUpdate()` and `update()` are part of the shared mental model even if host implementations differ.

### Public: `RadiantElement`

`RadiantElement` becomes the single public custom-element base.

Illustrative shape:

```ts
export class RadiantElement<Bindings extends object = {}> extends HTMLElement {
	readonly bindings: ReactiveBindings<Bindings>;
	readonly $: ReactiveBindings<Bindings>;

	connectedCallback(): void;
	disconnectedCallback(): void;
	attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;

	render(): JsxRenderable;
	requestUpdate(): void;
	update(): void;
	hydrate(): void;

	renderToString(options?: RenderToStringOptions): string;
	renderHost(): JsxRenderable;
	renderHostToString(options?: RenderToStringOptions): string;

	getRef<T extends Element = Element>(ref: string, all: true): T[];
	getRef<T extends Element = Element>(ref: string, all?: false): T | null;
	getSlotElement<T extends Element = Element>(name?: string): T | null;
	getSlotElements<T extends Element = Element>(name?: string): T[];

	bind<Property extends keyof Bindings & string>(property: Property): SubscribableJsxValue<Bindings[Property]>;
	registerConnectedCallback(callback: () => void): void;
	registerCleanupCallback(callback: () => void): void;
}
```

Default behavior:

- `render()` defaults to slot passthrough behavior.
- first connect triggers `hydrate()` or `update()`.
- `@prop`, `@state`, and `@signal` participate in tracked rerender invalidation by default.

### Public: `RadiantController`

`RadiantController` is a DOM-attached reactive controller.

Illustrative shape:

```ts
export class RadiantController<Bindings extends object = {}> {
	readonly host: Element;
	readonly element: Element;
	readonly bindings: ReactiveBindings<Bindings>;
	readonly $: ReactiveBindings<Bindings>;

	constructor(host: Element);

	connect(): void;
	disconnect(): void;
	requestUpdate(): void;
	update(): void;

	getRef<T extends Element = Element>(ref: string, all: true): T[];
	getRef<T extends Element = Element>(ref: string, all?: false): T | null;
	bind<Property extends keyof Bindings & string>(property: Property): SubscribableJsxValue<Bindings[Property]>;
	registerConnectedCallback(callback: () => void): void;
	registerCleanupCallback(callback: () => void): void;
}
```

Notes:

- `host` and `element` are the same object. Exposing both makes controller code read naturally for both Stimulus-style and Radiant-style users.
- controller instances are attached by the registry runtime rather than by custom-element upgrade.

### Public: `@attr(...)`

`@attr(...)` is the attribute channel complement to `@prop(...)`.

Illustrative shape:

```ts
export type AttrOptions<T = string> = {
	source?: string;
	bind?: ReactiveBindingOption;
	defaultValue?: T;
	converter?: {
		fromAttribute?: (value: string | null) => T;
		toAttribute?: (value: T) => string | null;
	};
};

export function attr<T = string>(options?: AttrOptions<T>): PropertyDecorator;
```

Rules:

- default source name is the field name transformed into attribute form
- controller-authored HTML should favor `data-*` names
- attribute values remain attribute-backed rather than full property-reflection semantics
- `bind` should behave consistently with `@state` and `@prop`

### Public: controller registration

Illustrative shape:

```ts
export function controller(identifier: string): ClassDecorator;

export function registerController(identifier: string, ctor: ControllerConstructor): void;
export function startControllers(root?: ParentNode): ControllerRegistryRuntime;
export function stopControllers(): void;
```

Controller discovery contract:

- `data-controller="search"` attaches the `search` controller
- multiple controllers may be space-separated if supported in v1
- `data-*` attributes carry authored controller input

### JSX transport

Illustrative shape:

```tsx
<user-card prop:user={user} attr:data-state="ready" attr:aria-label="User card" />
```

Rules:

- `prop:` sets a host property
- `attr:` sets a literal attribute
- `@attr(...)` reads from the attribute channel
- `@prop(...)` reads from the property channel

## Proposed Public Model

### 1. Reactive Host Core

Introduce an internal host contract that owns:

- reactive dependency tracking
- update notification
- update callbacks
- connected callbacks
- cleanup callbacks
- signal integration
- JSX binding accessors

This layer should not assume:

- `customElements.define(...)`
- custom-element upgrade timing
- attribute reflection as the only input model
- slot projection
- host serialization

### 2. RadiantElement

`RadiantElement` should become the single public Web Component base.

It should include:

- the current reactive DOM host features from `RadiantElement`
- the current JSX render scheduling from `RadiantComponent`
- hydration support
- host serialization hooks
- slot-aware rendering behavior where applicable

The current split between `RadiantElement` and `RadiantComponent` is useful internally, but it does not need to remain the public product shape.

Migration direction:

- existing `RadiantComponent` users move to `RadiantElement`
- `RadiantComponent` imports, exports, docs, and tests are updated in this release
- new docs teach only `RadiantElement`

### 3. RadiantController

Add a controller abstraction with a Stimulus-like runtime model.

Illustrative shape:

```ts
class SearchController extends RadiantController {
	@attr() query?: string;
	@state results: string[] = [];
	@signal() isLoading = false;

	connect() {
		this.load();
	}

	disconnect() {}

	async load() {
		this.isLoading.set(true);
		// ...
		this.isLoading.set(false);
	}
}
```

The runtime would discover controller hosts from the DOM and instantiate them against existing elements.

Illustrative HTML:

```html
<section data-controller="search" data-query="books"></section>
```

### 4. Controller Registry

Add an internal registry and a public registration mechanism for controller classes.

Illustrative options:

- `controller('search')`
- `registerController('search', SearchController)`

Preferred direction: a dedicated `controller(...)` decorator plus a registry API for manual registration.

Follow-up to evaluate: an optional auto-registration flow that can discover controller classes without explicit per-controller `registerController(...)` calls, as long as the bundler/runtime integration remains explicit and predictable.

This is clearer than reusing `customElement(...)` with an option such as `{ pure: true }`.

### 5. Data Attribute Transport

Controller-authored HTML configuration should use `data-*` attributes only.

Requirements:

- controller discovery is keyed by `data-controller`
- primitive HTML-authored controller inputs are read from `data-*`
- the HTML contract should remain inspectable and framework-agnostic
- SSR and server-rendered HTML should not require custom-element upgrade semantics

Examples:

```html
<div data-controller="modal" data-open="true" data-title="Delete project"></div>
```

## Input Semantics

Radiant should distinguish three input channels.

### A. `attr(...)`

New decorator.

Purpose:

- read a raw attribute value reactively
- no property reflection contract
- optimized for HTML-authored primitive input
- controller-friendly

Illustrative usage:

```ts
class SearchController extends RadiantController {
	@attr() query?: string;
	@attr({ source: 'data-page' }) page?: string;
}
```

Semantics:

- default type is string or undefined
- reads from an attribute name
- can target plain attributes or `data-*` attributes
- updates when the underlying attribute changes
- does not imply serializer or converter behavior beyond explicit options
- does not create a rich property contract

Naming rationale:

- `attr(...)` aligns with `prop(...)`
- `attr:` in JSX and `@attr(...)` in class code reinforce the same mental model
- the shorter name is easier to scan in author code

### B. `prop(...)`

Existing decorator, retained.

Purpose:

- rich host property semantics
- typed conversion when relevant
- JSX-first composition
- imperative host-to-host composition

Rationale:

`prop(...)` becomes more valuable, not less, once Radiant supports controllers. JSX can pass values that are difficult or inappropriate to serialize through HTML attributes, including:

- objects
- arrays
- callbacks
- writable signals
- domain models

`prop(...)` should remain the main tool for property-driven composition in JSX.

For controllers, `prop(...)` should be supported only if the runtime can set properties directly during controller instantiation or through explicit imperative APIs. It should not be treated as the primary authored HTML transport for controllers.

### C. `data-*` Attributes

Purpose:

- authored HTML configuration for controller mode
- progressive enhancement compatibility
- simple server-to-client data forwarding

Product requirement:

When data is authored in HTML for controllers, the default transport is `data-*` attributes.

## JSX Model

Radiant should preserve a JSX experience that can target both elements and controllers.

### Proposed Rule

- `prop:` prefix in JSX sets a host property
- `attr:` prefix in JSX sets an HTML attribute

Illustrative usage:

```tsx
<search-panel prop:filters={{ category: 'books' }} attr:data-view="grid" attr:aria-label="Search panel" />
```

This proposal makes the transport explicit.

Benefits:

- avoids overloading `prop(...)`
- preserves HTML attributes as first-class authored state
- supports controller use cases cleanly
- avoids ambiguity between string serialization and property assignment

### Open Naming Question

`attr:` is the preferred prefix in this PRD because it is concise and legible. Alternative names should only be considered if they align better with existing `@ecopages/jsx` conventions.

## Decorator Compatibility Matrix

The product should explicitly define which decorators are shared and which are host-specific.

### Shared Across `RadiantElement` and `RadiantController`

- `@state(...)`
- `@signal(...)`
- `@onUpdated(...)`
- `@bound(...)`
- likely `@debounce(...)`
- selected context decorators if their lifecycle assumptions remain valid

### Element-Only

- `@customElement(...)`
- `@prop(...)` with attribute reflection semantics tied to element attributes
- `@query(...)`
- `@querySlot(...)`
- event emitters that require DOM event dispatch from a host element instance

### Controller-Specific or Controller-Optimized

- `@controller(...)`
- `@attr(...)`
- future target/action decorators if Radiant adopts more Stimulus-like patterns

Important: `@prop(...)` may still exist on controllers if property assignment is useful, but its semantics must be defined independently from the element attribute-reflection contract.

Also important: `RadiantElement` and `RadiantController` should be the public teaching model. `ReactiveHost` is internal infrastructure, and `RadiantComponent` should not remain a third first-class concept.

## Lifecycle Model

### Custom Elements

`RadiantElement` owns the existing custom-element lifecycle plus the current `RadiantComponent` render and hydration lifecycle.

### Controllers

Proposed lifecycle:

1. registry discovers element with `data-controller`
2. controller instance is created
3. instance receives host element reference
4. reactive members initialize
5. `connect()` runs
6. cleanup callbacks run on detach
7. `disconnect()` runs before disposal

The lifecycle should feel familiar to Stimulus users, but the internal reactive behavior should feel identical to Radiant hosts.

## API Requirements

### Required

1. Internal `ReactiveHost` extraction.
2. Public `RadiantElement` as the single Web Component base.
3. Public `RadiantController` base class.
4. Public controller registry API.
5. New `@attr(...)` decorator.
6. Explicit JSX support for attribute assignment via `attr:`.
7. Documentation that explains when to use `attr` vs `prop`.
8. Removal of `RadiantComponent` from source, exports, tests, and docs.

### Nice to Have

1. MutationObserver-backed controller auto-connect runtime.
2. Optional controller auto-registration that can wire discovered controller classes into the registry without manual registration boilerplate.
3. Optional typed converters for `attr(...)`.
4. Controller test helpers.

## UX Requirements

The resulting mental model should be simple:

- use `RadiantElement` when you want a Web Component
- use `RadiantController` when you want reactive behavior on existing DOM
- use `data-*` when HTML authors configure a controller
- use `@attr(...)` for reactive attribute reads
- use `@prop(...)` for rich property semantics, especially from JSX

If users cannot explain that distinction in one minute, the design is too complicated.

## SSR and Hydration Scope

Phase 1 should not require full controller SSR serialization or hydration parity with the current `RadiantComponent` feature set that moves into `RadiantElement`.

Phase 1 requirements:

- controllers can attach to server-rendered HTML
- `data-*` attributes are sufficient for authored configuration
- controller runtime can initialize from existing DOM

Deferred:

- controller-owned render/hydrate pipeline
- controller slot projection
- controller SSR host serialization

## Alternatives Considered

### Alternative A: `@customElement(name, { pure: true })`

Rejected as the primary design.

Why:

- conflates registration with host model
- suggests controller mode is a disabled custom element rather than a different product concept
- creates awkward typing and documentation
- makes runtime discovery semantics less obvious

### Alternative B: Keep Only Custom Elements

Rejected.

Why:

- leaves the reusable reactive substrate locked behind custom-element assumptions
- does not address progressive enhancement use cases
- misses the opportunity to position Radiant as both a component and controller system

### Alternative C: Controllers Without Shared Decorators

Rejected.

Why:

- duplicates the mental model
- forces users to learn separate reactive APIs
- weakens the value of Radiant's existing decorator system

## Success Metrics

1. A controller can be attached to existing HTML using `data-controller` and `data-*` attributes.
2. `@state(...)` and `@signal(...)` work consistently across elements and controllers.
3. `@attr(...)` covers simple attribute-backed input without requiring `@prop(...)`.
4. JSX can explicitly choose property assignment or attribute assignment.
5. Existing custom-element users have a straightforward migration from `RadiantComponent` to `RadiantElement`.
6. The docs can explain the model in one short guide without caveats dominating the story.
7. The package root no longer exports `RadiantComponent`.

## Rollout Plan

### Phase 1: Internal Architecture

- extract `ReactiveHost`
- merge `RadiantComponent` behavior into `RadiantElement`
- delete `RadiantComponent`
- define host capability boundaries

### Phase 2: Controller Runtime

- add `RadiantController`
- add controller registry
- add DOM discovery and lifecycle attachment

### Phase 3: Input Model

- add `@attr(...)`
- add explicit JSX attribute transport support
- document `attr` vs `prop`

### Phase 4: Ecosystem Fit

- add examples
- add test coverage across both host modes
- evaluate follow-up controller decorators such as targets or actions

## Risks

### Risk 1: Surface Area Growth

Adding controllers, a new decorator, and JSX prefixes could make Radiant feel larger.

Mitigation:

- keep the mental model centered on one shared reactive host
- keep controller-specific APIs small
- document defaults clearly

### Risk 2: Semantic Drift Between Hosts

Shared decorators may behave differently across elements and controllers.

Mitigation:

- define host capability contracts explicitly
- publish a compatibility matrix
- avoid pretending every decorator is universal

### Risk 3: `prop(...)` Becomes Ambiguous

Users may confuse HTML-authored data with JSX property passing.

Mitigation:

- recommend `data-*` for HTML-authored controller inputs
- add `@attr(...)` for attribute-backed reads
- make JSX assignment channels explicit with `prop:` and `attr:`

### Risk 4: Merging `RadiantElement` and `RadiantComponent` Makes the Default Element Base Heavier

Bringing render and hydration behavior into `RadiantElement` could make the base class feel less minimal.

Mitigation:

- keep the API small even if the implementation is richer
- preserve explicit `render()` and `update()` entry points
- make the default `render()` behavior cheap and slot-like when unused

## Open Questions

1. Should controller classes be instantiated per matching element or support shared singleton services separately?
2. Should `@attr(...)` support typed converters in v1 or stay string-only first?
3. Should controller event helpers mirror Stimulus `data-action` patterns, or should that remain a future extension?
4. Should `@prop(...)` on controllers exist in v1, or should it be deferred until there is a clear property assignment story?
5. Does `attr:` fit naturally into the current JSX runtime, or is a lower-level attribute helper needed first?

## Recommendation

Proceed with a `ReactiveHost` internal extraction, a single public `RadiantElement` Web Component base, and a separate public `RadiantController` abstraction.

Treat `data-*` attributes as the default HTML transport for controllers.

Keep `@prop(...)` as the rich property abstraction, especially for JSX.

Add `@attr(...)` to fill the current gap between raw attributes and full prop semantics.

Do not repurpose `RadiantComponent` to mean controller mode, and do not use `@customElement(..., { pure: true })` as the main API for this feature.

Delete `RadiantComponent` directly in this release after migrating its behavior into `RadiantElement`.
