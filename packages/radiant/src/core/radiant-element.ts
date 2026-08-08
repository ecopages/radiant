import type { EventEmitter } from '../tools';
import { hasHydrationMarkers, jsx, type JsxRenderable, type SubscribableJsxValueWithAccess } from '@ecopages/jsx';
import { HostSsrRegistry } from './host-ssr-registry';
import { getReactivePropDefinitions, type ReactivePropDefinition } from './reactive-prop-metadata';
import { ensureLegacyHostReady } from '../decorators/legacy/host-readiness';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import type { UnknownContext } from '../context/types';
import {
	type ReactiveBindingOption,
	type ReactiveBindingValue,
	type ReactiveBindings,
	type ReactiveFieldOptions,
	type ReactiveProperty,
	type ReactivePropertyOptions,
} from './reactive-prop-core';
import { EventSubscriptionRegistry } from './event-subscription-registry';
import { ReactivePropertyState } from './reactive-property-state';
import { RenderRuntime, type RenderRuntimeHost } from './render-runtime';
import { RenderScheduler } from './render-scheduler';
import type { SsrSerializableHydrationBinding } from './ssr-hydration-binding';
import { ReactiveHost } from './reactive-host';
import type { ReactiveState } from './reactivity-contract';
import { runSsrPreparationCallbacks } from './ssr-preparation';
import { isRadiantHydratorInstalled } from './radiant-hydrator-state';
import { getRadiantElementSsrRuntime, type RadiantElementRenderToStringOptions } from './radiant-element-ssr-registry';
import { RADIANT_ELEMENT_BRAND } from './radiant-element-brand';
import { getInitialValue } from '../utils/attribute-utils';

export type {
	ReactiveBindingOption,
	ReactiveBindingValue,
	ReactiveBindings,
	ReactiveFieldOptions,
	ReactiveProperty,
	ReactivePropertyOptions,
} from './reactive-prop-core';

const RadiantElementBase = resolveRadiantElementBase();

type RadiantRenderTarget = HTMLElement | ShadowRoot;
type RadiantInteractionTarget = HTMLElement | ShadowRoot;
type RadiantRenderSurface = {
	renderTarget: RadiantRenderTarget;
	interactionTarget: RadiantInteractionTarget;
	queryRoot: ParentNode;
};

function resolveRadiantElementBase(): typeof HTMLElement {
	if (typeof HTMLElement !== 'undefined') {
		return HTMLElement;
	}

	throw new Error(
		"RadiantElement requires HTMLElement. Install '@ecopages/radiant/server/light-dom-shim' before SSR imports.",
	);
}

/**
 * Possible positions to insert a rendered template.
 */
export type RenderInsertPosition = 'replace' | 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend';

/**
 * Represents a Radiant element event listener.
 */
export type RadiantElementEventListener = {
	selector: string;
	type: string;
	listener: EventListener;
	options?: AddEventListenerOptions;
};

type StringPropertyKey<Value> = Extract<keyof Value, string>;

/**
 * Represents an interface for a Radiant element.
 * @typeParam Bindings - Explicit internal bindable shape used to type `bind()` and `getReactiveBinding()`.
 *
 * This shape describes which reactive members are exposed through `bindings`,
 * `$`, and `bind(...)`. It does not automatically define the public JSX
 * attribute contract for the custom element.
 */
export interface IRadiantElement<Bindings extends object = {}> {
	/**
	 * Namespace of cached JSX bindings keyed by the explicit bindable shape.
	 */
	readonly bindings: ReactiveBindings<Bindings>;

	/**
	 * Short alias for {@link bindings}.
	 */
	readonly $: ReactiveBindings<Bindings>;

	/**
	 * Called when a property of the element is updated.
	 * @param changedProperty - The name of the changed property.
	 * @param oldValue - The old value of the property.
	 * @param newValue - The new value of the property.
	 */
	notifyUpdate(changedProperty: string, oldValue: unknown, newValue: unknown): void;

	/**
	 * Subscribes to a Radiant element event.
	 * @param event - The event listener to subscribe to.
	 */
	subscribeEvent(event: RadiantElementEventListener): void;

	/**
	 * Registers a callback to be invoked when a reactive property or field changes.
	 *
	 * @returns A cleanup function that unregisters the callback.
	 */
	registerUpdateCallback(property: string, update: () => void): () => void;

	/**
	 * Returns a subscribable JSX child binding for a reactive property or field.
	 *
	 * Prefer `this.bindings.key` or `this.$.key` in JSX render code when you want
	 * property access syntax without string literals.
	 */
	bind<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValueWithAccess<ReactiveBindingValue<Bindings, Property>>;

	/**
	 * Returns a subscribable JSX child binding for a reactive property or field.
	 *
	 * This is the primitive lookup used by `bind()`, `bindings.key`, and `$.key`.
	 */
	getReactiveBinding<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValueWithAccess<ReactiveBindingValue<Bindings, Property>>;

	/**
	 * Defines a stable JSX binding companion accessor for a reactive member.
	 *
	 * Companion bindings create properties such as `$count` directly on the host.
	 * Prefer the `bindings` or `$` namespace for new code when you want typed,
	 * explicit access to the configured bindable shape.
	 */
	defineReactiveBinding(property: string, bind?: ReactiveBindingOption): void;

	/**
	 * Subscribes to multiple Radiant element events.
	 * @param events - The array of event listeners to subscribe to.
	 */
	subscribeEvents(events: RadiantElementEventListener[]): void;

	/**
	 * It adds a callback to be executed when the Radiant element is disconnected from the DOM.
	 */
	registerCleanupCallback(callback: () => void): void;

	/**
	 * Registers a callback to run on each future host connection.
	 *
	 * The callback is only invoked from `connectedCallback()`. Registering it
	 * after the host is already connected does not invoke it immediately.
	 */
	registerConnectedCallback(callback: () => void): void;

	/**
	 * Creates a new reactive member state and registers it under `propertyName`.
	 */
	createReactiveMember<T>(propertyName: string, initialValue: T): ReactiveState<T>;

	/**
	 * Registers an externally-owned reactive member state (used by `signal()`).
	 */
	registerReactiveMember<T>(propertyName: string, signal: ReactiveState<T>): void;

	/**
	 * Returns the member state registered under `propertyName`, if any.
	 */
	getReactiveMember<T = unknown>(propertyName: string): ReactiveState<T> | undefined;

	/**
	 * Renders a trusted HTML template string into the specified target element.
	 *
	 * **Security:** The `template` string is written to the DOM via `innerHTML`
	 * or `insertAdjacentHTML` without built-in sanitization. Callers are
	 * responsible for ensuring the input is trusted. Supply a `sanitize`
	 * function to transform the template before insertion.
	 *
	 * @param options - The rendering options.
	 * @param options.target - The target element to render the template into.
	 * @param options.template - The template string to render.
	 * @param options.insert - The position to insert the rendered template. (optional)
	 * @param options.sanitize - An optional function that transforms the template string before insertion.
	 */
	renderTemplate(options: {
		target: HTMLElement;
		template: string;
		insert?: RenderInsertPosition;
		sanitize?: (html: string) => string;
	}): void;

	/**
	 * Called when the Radiant element is connected to a context.
	 * @param context - The connected context.
	 */
	connectedContextCallback(context: UnknownContext): void;

	/**
	 * Gets a reference to a child element by its data-ref attribute.
	 * @param ref - The data-ref attribute value of the element to get.
	 * @param all - Whether to get all elements with the specified data-ref attribute value.
	 * @returns The element with the specified data-ref attribute value, an array of elements or null if no element was found.
	 */
	getRef<T extends Element = Element>(ref: string, all: true): T[];
	getRef<T extends Element = Element>(ref: string, all?: false): T | null;
}

/**
 * A base class for creating custom elements with reactive properties and event subscriptions.
 * @typeParam Bindings - Explicit internal bindable shape. Include only the
 * prop/state keys that JSX bindings should accept.
 *
 * Prefer a separate public props type for custom-element JSX declarations when
 * the external attribute contract differs from the component's internal
 * reactive state. Reuse the same type only when the public props and bindable
 * members are intentionally identical.
 * @extends HTMLElement
 * @implements IRadiantElement<Bindings>
 */
export class RadiantElement<Bindings extends object = {}>
	extends RadiantElementBase
	implements IRadiantElement<Bindings>
{
	declare readonly [RADIANT_ELEMENT_BRAND]: true;
	/**
	 * Controls where the JSX render lifecycle mounts the component view.
	 *
	 * Subclasses can override this with `'shadow'` to force an internal open
	 * shadow root for client-side rendering. Host SSR helpers remain light-DOM
	 * only and throw when shadow render mode is enabled.
	 */
	readonly renderRootMode: 'light' | 'shadow' = 'light';
	public readonly bindings: ReactiveBindings<Bindings>;
	public readonly $: ReactiveBindings<Bindings>;
	private readonly reactiveHost: ReactiveHost<this, Bindings>;
	private readonly reactivePropertyState: ReactivePropertyState;
	private readonly eventSubscriptionRegistry: EventSubscriptionRegistry;

	/**
	 * Registered context providers and hydration bindings for SSR.
	 */
	private readonly hostSsrRegistry = new HostSsrRegistry();

	/**
	 * A map for event emitters
	 */
	private eventEmitters = new Map<string, EventEmitter>();

	/**
	 * A flag indicating whether the element has been connected to the DOM.
	 */
	private elementReady = false;
	private isFirstConnectPending = false;
	private readonly renderScheduler: RenderScheduler;
	private renderRuntime?: RenderRuntime;

	constructor() {
		super();
		this.reactivePropertyState = new ReactivePropertyState(this);
		this.eventSubscriptionRegistry = new EventSubscriptionRegistry(
			() => this.resolveRenderSurface().interactionTarget,
			() => this,
		);
		this.renderScheduler = new RenderScheduler({
			canFlush: () =>
				this.isConnected &&
				!this.renderScheduler.rendering &&
				!(this.isFirstConnectPending && shouldHydrateOnConnect(this)),
			commit: () => {
				const { renderTarget } = this.resolveRenderSurface();
				this.getOrCreateRenderRuntime().render(renderTarget as HTMLElement);
			},
		});

		this.reactiveHost = new ReactiveHost<this, Bindings>(
			this,
			{
				defineProperty: (target, property, descriptor) => Object.defineProperty(target, property, descriptor),
				getBindingTarget: (target) => Object.getPrototypeOf(target) ?? target,
				hasProperty: (target, property) => property in target,
				readProperty: (target, property) => (target as Record<string, unknown>)[property],
			},
			() => this.shouldAutoBindReactiveMembers(),
		);
		this.bindings = this.reactiveHost.bindings;
		this.$ = this.reactiveHost.$;
		ensureLegacyHostReady(this, 'construct');
	}

	public get slotProjectionVersion(): number {
		return this.renderRuntime?.slotProjectionVersion ?? 0;
	}

	connectedCallback() {
		ensureLegacyHostReady(this, 'connect');
		const isReconnectDuringPendingFirstConnect = this.isFirstConnectPending;

		// `attributeChangedCallback` is a no-op until `elementReady` flips true, so an
		// attribute set on this element before its first connect — e.g. the ordinary
		// `document.createElement(tag)` -> `setAttribute(...)` -> `append(...)` sequence
		// — never reaches `reactivePropertyState`. Catch those attributes up below, once.
		const isFirstConnect = !this.elementReady;
		this.elementReady = true;

		this.reactiveHost.connectHost();

		if (isReconnectDuringPendingFirstConnect) {
			return;
		}

		this.isFirstConnectPending = true;

		queueMicrotask(() => {
			this.isFirstConnectPending = false;

			if (!this.isConnected) {
				return;
			}

			// Deferred to a microtask — same as the render/hydrate calls below — so a
			// subclass's own `connectedCallback` override (which runs its post-`super()`
			// setup synchronously, right after this method returns) has already finished
			// before any `@onUpdated`/reactive side effect from the catch-up can fire.
			if (isFirstConnect) {
				this.syncAttributesOnFirstConnect();
			}

			if (!this.shouldRunRenderLifecycle()) {
				return;
			}

			const renderRuntime = this.getOrCreateRenderRuntime();
			renderRuntime.observeSlotProjection();

			// Persist/SPA morph can disconnect+reconnect the same host while SSR bind
			// markers still exist under projected slot content. Re-hydrating then leaves
			// prior boundary markers in place and appends a second light-DOM shell.
			if (shouldHydrateOnConnect(this) && !renderRuntime.hasMounted) {
				this.renderScheduler.clearPending();
				this.hydrate();

				if (this.renderScheduler.pending) {
					this.update();
				}

				return;
			}

			this.update();
		});
	}

	/**
	 * Replays `attributeChangedCallback` for every currently-set, registered attribute
	 * as if it had just changed from unset. Standard-decorator `@prop` fields read
	 * their initial value from the attribute at construction time, so this is a
	 * no-op in the common case — it only matters when an attribute was set (or
	 * changed) on this element after construction but before this first connect.
	 */
	private syncAttributesOnFirstConnect(): void {
		for (const property of this.reactivePropertyState.getAll()) {
			const currentValue = this.getAttribute(property.attribute);

			if (currentValue !== null) {
				this.attributeChangedCallback(property.attribute, null, currentValue);
			}
		}
	}

	connectedContextCallback(_contextName: UnknownContext): void {}

	disconnectedCallback() {
		// Keep the same `renderRuntime` instance across a disconnect/reconnect cycle —
		// only its transient observer/watcher get torn down (both reattach naturally on
		// the next render/hydrate). Discarding the instance here would reset its
		// slot-projection capture state too, and a light-DOM re-render that relocates a
		// still-connected descendant (removing then reinserting the same subtree) fires
		// this callback on that descendant without its authored content ever changing —
		// re-capturing at that point would treat the descendant's own already-rendered
		// output as fresh authored slot content.
		this.renderRuntime?.dispose();
		this.eventSubscriptionRegistry.removeAll();
		this.reactiveHost.disconnectHost();
	}

	public notifyUpdate(changedProperty: string, oldValue: unknown, value: unknown) {
		this.reactiveHost.notifyUpdate(changedProperty, oldValue, value);
	}

	attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
		if (oldValue === newValue || !this.elementReady) return;

		this.reactivePropertyState.applyAttributeChange(name, oldValue, newValue);
	}

	/**
	 * Renders a trusted HTML template string into the specified target element.
	 *
	 * **Security:** The `template` string is written to the DOM via `innerHTML`
	 * or `insertAdjacentHTML` without built-in sanitization. Callers are
	 * responsible for ensuring the input is trusted. Supply a `sanitize`
	 * function to transform the template before insertion.
	 */
	public renderTemplate({
		target = this,
		template,
		insert = 'replace',
		sanitize,
	}: {
		target: HTMLElement;
		template: string;
		insert?: RenderInsertPosition;
		sanitize?: (html: string) => string;
	}) {
		const html = sanitize ? sanitize(template) : template;
		switch (insert) {
			case 'replace':
				target.innerHTML = html;
				break;
			case 'beforeend':
				target.insertAdjacentHTML('beforeend', html);
				break;
			case 'afterbegin':
				target.insertAdjacentHTML('afterbegin', html);
				break;
			case 'beforebegin':
				target.insertAdjacentHTML('beforebegin', html);
				break;
			case 'afterend':
				target.insertAdjacentHTML('afterend', html);
				break;
		}
	}

	public render(): JsxRenderable {
		return jsx('slot', {});
	}

	public getReactivePropDefinitions(): ReactivePropDefinition[] {
		return getReactivePropDefinitions(this);
	}

	public getPropertyValue(name: string): unknown {
		return Reflect.get(this, name);
	}

	public renderViewToString(options: RadiantElementRenderToStringOptions = {}): string {
		if (!this.shouldRunRenderLifecycle()) {
			return this.innerHTML;
		}

		ensureLegacyHostReady(this, 'ssr');
		this.prepareForSsr();

		return requireRadiantElementSsrRuntime().renderView(this, options);
	}

	public hydrate(): void {
		if (!this.shouldRunRenderLifecycle() || !this.isConnected || this.renderScheduler.rendering) {
			return;
		}

		const { renderTarget } = this.resolveRenderSurface();
		const renderRuntime = this.getOrCreateRenderRuntime();

		this.renderScheduler.runExclusive(() => {
			renderRuntime.hydrate(renderTarget as HTMLElement);
		});
	}

	public requestUpdate(): void {
		if (!this.shouldRunRenderLifecycle()) {
			return;
		}

		this.renderScheduler.requestUpdate();
	}

	public update(): void {
		if (!this.shouldRunRenderLifecycle()) {
			return;
		}

		this.renderScheduler.markPending();
		this.renderScheduler.flush();
	}

	public registerReactiveProperty(config: ReactiveProperty) {
		this.reactivePropertyState.register(config);
	}

	public getReactiveProperties(): ReactiveProperty[] {
		return this.reactivePropertyState.getAll();
	}

	public registerContextProvider(name: string, provider: SsrSerializableContextProvider): void {
		this.hostSsrRegistry.registerContextProvider(name, provider);
	}

	public registerHydrationBinding(name: string, binding: SsrSerializableHydrationBinding): void {
		this.hostSsrRegistry.registerHydrationBinding(name, binding);
	}

	public getContextProviders(): SsrSerializableContextProvider[] {
		return this.hostSsrRegistry.getContextProviders();
	}

	public getHydrationBindings(): SsrSerializableHydrationBinding[] {
		return this.hostSsrRegistry.getHydrationBindings();
	}

	/**
	 * Flushes any deferred SSR-only preparation work before the host is
	 * serialized.
	 *
	 * Radiant uses this to reapply SSR consumer state after construction so the
	 * first server render sees finalized fields, props, and authored content.
	 */
	protected prepareForSsr(): void {
		runSsrPreparationCallbacks(this);
	}

	/**
	 * Returns the default JSX binding policy for reactive members on this host.
	 *
	 * `RadiantElement` hosts default to automatic bindings for reactive members
	 * when no explicit `bind` option is supplied.
	 *
	 * Lower-level hosts can override this hook to opt out when they want binding
	 * creation to stay fully explicit across `@prop`, `@state`, and direct
	 * `createReactiveProp`/`createReactiveField` calls.
	 */
	protected shouldAutoBindReactiveMembers(): boolean {
		return true;
	}

	protected shouldRunRenderLifecycle(): boolean {
		return this.render !== RadiantElement.prototype.render;
	}

	/** Returns the DOM root used by client-side render and hydrate work. */
	protected getRenderTarget(): RadiantRenderTarget {
		if (this.renderRootMode !== 'shadow') {
			return this;
		}

		if (this.shadowRoot) {
			return this.shadowRoot;
		}

		if (typeof this.attachShadow !== 'function') {
			throw new Error('RadiantElement shadow render mode requires attachShadow().');
		}

		return this.attachShadow({ mode: 'open' });
	}

	public registerUpdateCallback(property: string, update: () => void): () => void {
		return this.reactiveHost.registerUpdateCallback(property, update);
	}

	public getReactiveBinding<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValueWithAccess<ReactiveBindingValue<Bindings, Property>> {
		return this.reactiveHost.getReactiveBinding(property);
	}

	public bind<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValueWithAccess<ReactiveBindingValue<Bindings, Property>> {
		return this.reactiveHost.getReactiveBinding(property);
	}

	public defineReactiveBinding(property: string, bind: ReactiveBindingOption = true): void {
		this.reactiveHost.defineReactiveBinding(property, bind);
	}

	public createReactiveMember<T>(propertyName: string, initialValue: T): ReactiveState<T> {
		return this.reactiveHost.createReactiveMember(propertyName, initialValue);
	}

	public registerReactiveMember<T>(propertyName: string, signal: ReactiveState<T>): void {
		this.reactiveHost.registerReactiveMember(propertyName, signal);
	}

	public getReactiveMember<T = unknown>(propertyName: string): ReactiveState<T> | undefined {
		return this.reactiveHost.getReactiveMember(propertyName);
	}

	public subscribeEvents(events: RadiantElementEventListener[]): Array<() => void> {
		const unsubscribers: Array<() => void> = [];
		for (const event of events) {
			unsubscribers.push(this.subscribeEvent(event));
		}
		return unsubscribers;
	}

	public hasEventSubscription(subscriptionId: string): boolean {
		return this.eventSubscriptionRegistry.hasEventSubscription(subscriptionId);
	}

	public subscribeEvent(eventConfig: RadiantElementEventListener): () => void {
		return this.eventSubscriptionRegistry.subscribe(eventConfig);
	}

	/**
	 * Registers a callback that runs on every future disconnect.
	 */
	public registerCleanupCallback(callback: () => void): void {
		this.reactiveHost.registerCleanupCallback(callback);
	}

	/**
	 * Registers a callback that runs from `connectedCallback()` on future host
	 * connections.
	 *
	 * Registering after the host is already connected does not invoke the
	 * callback immediately.
	 */
	public registerConnectedCallback(callback: () => void): void {
		this.reactiveHost.registerConnectedCallback(callback);
	}

	public registerEventEmitter(name: string, emitter: EventEmitter) {
		this.eventEmitters.set(name, emitter);
	}

	public getRef<T extends Element = Element>(ref: string, all: true): T[];
	public getRef<T extends Element = Element>(ref: string, all?: false): T | null;
	public getRef<T extends Element = Element>(ref: string, all = false): T | T[] | null {
		const selector = `[data-ref="${ref}"]`;
		const { queryRoot } = this.resolveRenderSurface();
		if (all) {
			return Array.from(queryRoot.querySelectorAll(selector)) as T[];
		}
		return (queryRoot.querySelector(selector) as T) ?? null;
	}

	public getSlotElement<T extends Element = Element>(name?: string): T | null {
		return (this.getSlotElements<T>(name)[0] ?? null) as T | null;
	}

	public getSlotElements<T extends Element = Element>(name?: string): T[] {
		return this.getOrCreateRenderRuntime().getSlotElements<T>(name);
	}

	public createReactiveField<T>(propertyName: string, initialValue: T, options: ReactiveFieldOptions = {}): void {
		this.reactiveHost.createReactiveField(propertyName, initialValue, options);
	}

	/**
	 * Defines a reactive custom-element property backed by a Radiant accessor.
	 *
	 * When the host was assigned a value before upgrade, that pre-upgrade value is
	 * preferred over attribute parsing and `defaultValue` so early `.prop = value`
	 * writes survive into the reactive lifecycle.
	 */
	public createReactiveProp<T = unknown>(propertyName: string, options: ReactivePropertyOptions<T>): void {
		this.reactivePropertyState.create(
			propertyName,
			options,
			(type, attributeKey, defaultValue) => getInitialValue(this, type, attributeKey, defaultValue) as T,
			(name, config) => {
				this.reactiveHost.defineReactiveAccessor(name, config);
			},
			(name, initial) => this.createReactiveMember(name, initial),
		);
	}

	public getSlotProjectionScriptTag(): string | undefined {
		return this.getOrCreateRenderRuntime().getSlotProjectionScriptTag();
	}

	public getAuthoredHydrationScriptMarkup(): string | undefined {
		return this.getOrCreateRenderRuntime().getAuthoredHydrationScriptMarkup();
	}

	public resolveTrackedRenderOutput(): { containsSlots: boolean; value: JsxRenderable } {
		return this.getOrCreateRenderRuntime().resolveTrackedRenderOutput();
	}

	private getOrCreateRenderRuntime() {
		if (this.renderRuntime) {
			return this.renderRuntime;
		}

		this.renderRuntime = new RenderRuntime(this as RenderRuntimeHost);
		return this.renderRuntime;
	}

	private resolveRenderSurface(): RadiantRenderSurface {
		const renderTarget = this.getRenderTarget();
		const interactionTarget =
			typeof ShadowRoot !== 'undefined' && renderTarget instanceof ShadowRoot ? renderTarget : this;

		return {
			interactionTarget,
			queryRoot: interactionTarget,
			renderTarget,
		};
	}
}

Object.defineProperty(RadiantElement.prototype, RADIANT_ELEMENT_BRAND, {
	value: true,
	configurable: true,
});

function requireRadiantElementSsrRuntime() {
	const runtime = getRadiantElementSsrRuntime();

	if (!runtime) {
		throw new Error('Radiant SSR runtime unavailable. Import `@ecopages/radiant/server/render-component` first.');
	}

	return runtime;
}

function shouldHydrateOnConnect(component: HTMLElement): boolean {
	return isRadiantHydratorInstalled() && hasHydrationMarkers(component);
}
