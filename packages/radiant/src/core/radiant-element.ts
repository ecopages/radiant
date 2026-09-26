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
import { UpdateCycle } from './update-cycle';
import type { SsrSerializableHydrationBinding } from './ssr-hydration-binding';
import { ReactiveHost, type UpdatedCallback } from './reactive-host';
import type { ReactiveState } from './reactivity-contract';
import { runSsrPreparationCallbacks } from './ssr-preparation';
import { isRadiantHydratorInstalled } from './radiant-hydrator-state';
import { getRadiantElementSsrRuntime, type RadiantElementRenderToStringOptions } from './radiant-element-ssr-registry';
import { RADIANT_ELEMENT_BRAND } from './radiant-element-brand';
import { getInitialValue } from '../utils/attribute-utils';

export type {
	PropTransform,
	ReactiveBindingOption,
	ReactiveBindingValue,
	ReactiveBindings,
	ReactiveFieldOptions,
	ReactiveProperty,
	ReactivePropertyOptions,
} from './reactive-prop-core';

const RadiantElementBase = resolveRadiantElementBase();

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
	 *
	 * @returns A cleanup that removes this registration only.
	 *
	 * @remarks
	 * Each call installs its own listener. Two subscriptions with the same
	 * `type` and `selector` stay independent: unsubscribing one does not remove
	 * the other, and disconnect still removes every remaining registration.
	 */
	subscribeEvent(event: RadiantElementEventListener): () => void;

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
	 *
	 * @returns A cleanup function for each registration, in the same order.
	 */
	subscribeEvents(events: RadiantElementEventListener[]): Array<() => void>;

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
	 * Registers a callback that runs after attribute catch-up and the initial
	 * hydrate/update, before `onConnected()`.
	 */
	registerPostSyncCallback(callback: () => void): void;

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
	 * Set at the start of `connectedCallback`. Until then, `attributeChangedCallback`
	 * ignores attribute writes so parser/JSX/`setAttribute` values wait for
	 * `completeInitialSync`.
	 */
	private elementReady = false;
	private isFirstConnectPending = false;
	private readonly updateCycle: UpdateCycle;
	private renderRuntime?: RenderRuntime;

	constructor() {
		super();
		this.reactivePropertyState = new ReactivePropertyState(this);
		this.eventSubscriptionRegistry = new EventSubscriptionRegistry(this);
		this.updateCycle = new UpdateCycle({
			canFlush: () => this.isConnected && !this.isFirstConnectPending,
			runCallbacks: (changed) => this.reactiveHost.runUpdatedCallbacks(changed),
			commit: () => this.getOrCreateRenderRuntime().render(this),
			updated: (changed) => this.updated(changed),
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
			(propertyName) => this.updateCycle.markChanged(propertyName),
		);
		this.bindings = this.reactiveHost.bindings;
		this.$ = this.reactiveHost.$;
		ensureLegacyHostReady(this, 'construct');
	}

	public get slotProjectionVersion(): number {
		return this.renderRuntime?.slotProjectionVersion ?? 0;
	}

	/**
	 * @remarks
	 * `attributeChangedCallback` is a no-op until `elementReady`, so an attribute
	 * set between `createElement` and `append` never reaches `reactivePropertyState`
	 * until first connect. First-connect work (attribute adoption, hydrate/update)
	 * is deferred one microtask so a subclass `connectedCallback` that runs after
	 * `super()` has finished before any `@onUpdated` from catch-up can fire.
	 *
	 * The update cycle stays blocked until that microtask: it runs the batched
	 * `@onUpdated` callbacks for everything adopted, renders or hydrates, flushes
	 * `@bindTo`, calls `onConnected()`, and finishes with `updated(changed)`.
	 */
	connectedCallback() {
		ensureLegacyHostReady(this, 'connect');
		const isReconnectDuringPendingFirstConnect = this.isFirstConnectPending;

		const isFirstConnect = !this.elementReady;
		this.elementReady = true;

		this.reactiveHost.connectHost();

		if (isReconnectDuringPendingFirstConnect) {
			return;
		}

		this.isFirstConnectPending = true;
		const releaseConnectSync = this.updateCycle.hold();

		queueMicrotask(() => {
			this.isFirstConnectPending = false;

			try {
				if (this.isConnected) {
					this.runConnectSync(isFirstConnect);
				}
			} finally {
				releaseConnectSync();
			}
		});
	}

	private runConnectSync(isFirstConnect: boolean): void {
		this.updateCycle.flush(() => {
			if (isFirstConnect) {
				this.reactivePropertyState.completeInitialSync();
			}

			this.updateCycle.runCallbacks();

			if (this.shouldRunRenderLifecycle()) {
				const renderRuntime = this.getOrCreateRenderRuntime();
				renderRuntime.observeSlotProjection();

				if (this.needsInitialHydration(renderRuntime)) {
					this.hydrate();

					if (this.updateCycle.renderPending) {
						this.update();
					}
				} else if (!this.isReconnectWithLiveProjection(renderRuntime)) {
					this.update();
				}
			}

			this.flushPostSyncCallbacks();
			this.onConnected();
		});
	}

	/**
	 * Lifecycle hook invoked after every host connection, once attribute catch-up,
	 * initial property sync, and (when applicable) the initial hydrate/update have
	 * completed.
	 *
	 * @remarks
	 * This replaces the former `connectedCallback` + `queueMicrotask(sync)`
	 * boilerplate: it runs at exactly the point that boilerplate targeted, so
	 * authored attributes are visible and view-owned light-DOM children are
	 * queryable via `data-ref`. It fires on every connection, not once per
	 * instance — hosts that tear down in `disconnectedCallback` (controllers,
	 * observers, listeners, timers) must rebuild here to survive reconnects.
	 * Once-only bootstrapping should guard itself explicitly.
	 *
	 * This is not `ReactiveHost.registerConnectedCallback()`. Those callbacks
	 * run synchronously from `connectHost()` at the start of `connectedCallback`,
	 * before attribute catch-up. Override this hook for post-sync work.
	 */
	protected onConnected(): void {}

	/**
	 * Lifecycle hook invoked after each update cycle, once batched `@onUpdated`
	 * callbacks ran and any pending render committed.
	 *
	 * @param changed - Reactive members that changed during the cycle.
	 *
	 * @remarks
	 * Use it for work that needs the committed DOM: focus, selection, measuring.
	 * The first cycle ends after `onConnected()`. State written here schedules
	 * another cycle.
	 */
	protected updated(_changed: ReadonlySet<string>): void {}

	/**
	 * Resolves after the pending update cycle (and, on connect, the first render) finishes.
	 *
	 * @remarks Stays pending while the host is disconnected with queued work.
	 */
	public get updateComplete(): Promise<void> {
		return this.updateCycle.updateComplete;
	}

	/**
	 * @remarks A host can disconnect and reconnect while keeping the same instance (e.g. SPA
	 * body swaps that move a live subtree). Re-hydrating then would leave prior SSR boundary
	 * markers in place and append a second light-DOM shell.
	 */
	private needsInitialHydration(renderRuntime: RenderRuntime): boolean {
		return shouldHydrateOnConnect(this) && !renderRuntime.hasMounted;
	}

	/**
	 * @remarks Already-mounted reconnects with projected slot content must keep the existing
	 * light DOM — a fresh `update()` would re-project slots and reset scroll/input state.
	 */
	private isReconnectWithLiveProjection(renderRuntime: RenderRuntime): boolean {
		return renderRuntime.hasMounted && renderRuntime.hasProjectedSlotContent;
	}

	connectedContextCallback(_contextName: UnknownContext): void {}

	/**
	 * @remarks
	 * Keep the same `renderRuntime` instance across a disconnect/reconnect cycle —
	 * only its transient observer/watcher get torn down (both reattach naturally on
	 * the next render/hydrate). Discarding the instance here would reset its
	 * slot-projection capture state too, and a light-DOM re-render that relocates a
	 * still-connected descendant (removing then reinserting the same subtree) fires
	 * this callback on that descendant without its authored content ever changing —
	 * re-capturing at that point would treat the descendant's own already-rendered
	 * output as fresh authored slot content.
	 */
	disconnectedCallback() {
		this.renderRuntime?.dispose();
		this.eventSubscriptionRegistry.removeAll();
		this.reactiveHost.disconnectHost();
	}

	public notifyUpdate(changedProperty: string, oldValue: unknown, value: unknown) {
		this.reactiveHost.notifyUpdate(changedProperty, oldValue, value);
	}

	/**
	 * @remarks
	 * Ignored until `elementReady` so construction-time and pre-connect attribute
	 * writes are adopted once in `completeInitialSync` instead of racing the
	 * accessor definition.
	 */
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

	/**
	 * Serializes the JSX view through the installed server runtime.
	 *
	 * @remarks Flushes `@bindTo` after `render()` so targets created by a Derived
	 * Tree exist before serialization. `prepareForSsr` still flushes authored
	 * light-DOM children that exist before render.
	 */
	public renderViewToString(options: RadiantElementRenderToStringOptions = {}): string {
		if (!this.shouldRunRenderLifecycle()) {
			return this.innerHTML;
		}

		ensureLegacyHostReady(this, 'ssr');
		this.prepareForSsr();

		const html = requireRadiantElementSsrRuntime().renderView(this, options);
		this.flushPostSyncCallbacks();
		return html;
	}

	public hydrate(): void {
		if (!this.shouldRunRenderLifecycle() || !this.isConnected || this.updateCycle.rendering) {
			return;
		}

		const renderRuntime = this.getOrCreateRenderRuntime();
		this.updateCycle.commit(() => renderRuntime.hydrate(this));
	}

	/** Schedules one render in the next update cycle; repeated calls coalesce. */
	public requestUpdate(): void {
		if (!this.shouldRunRenderLifecycle()) {
			return;
		}

		this.updateCycle.requestRender();
	}

	/**
	 * Runs the update cycle now: pending `@onUpdated` callbacks, the render, then `updated()`.
	 *
	 * @remarks Called from inside a running cycle (for example an `@onUpdated`
	 * callback), it commits the render immediately and leaves the rest to that cycle.
	 */
	public update(): void {
		if (!this.shouldRunRenderLifecycle()) {
			return;
		}

		this.updateCycle.requestRender();

		if (this.updateCycle.flushing) {
			this.updateCycle.commit();
			return;
		}

		this.updateCycle.flush();
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
	 * @remarks
	 * Hosts never connect on the server, so the batched `@onUpdated` callbacks
	 * queued by prop writes run here, before and after the SSR preparation
	 * callbacks (which may write state too). Then `@bindTo` flushes, so the
	 * first server render sees finalized fields, props, and authored content.
	 */
	public prepareForSsr(): void {
		this.updateCycle.runCallbacks();
		runSsrPreparationCallbacks(this);
		this.updateCycle.runCallbacks();
		this.flushPostSyncCallbacks();
	}

	/** Runs `@bindTo` and other post-sync callbacks registered on this host. */
	public flushPostSyncCallbacks(): void {
		this.reactiveHost.flushPostSyncCallbacks();
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

	public registerUpdateCallback(property: string, update: () => void): () => void {
		return this.reactiveHost.registerUpdateCallback(property, update);
	}

	public registerUpdatedCallback(keys: readonly string[], callback: UpdatedCallback): () => void {
		return this.reactiveHost.registerUpdatedCallback(keys, callback);
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

	/**
	 * Registers a callback that runs after attribute catch-up and the initial
	 * hydrate/update, before `onConnected()`, including on reconnect.
	 */
	public registerPostSyncCallback(callback: () => void): void {
		this.reactiveHost.registerPostSyncCallback(callback);
	}

	public registerEventEmitter(name: string, emitter: EventEmitter) {
		this.eventEmitters.set(name, emitter);
	}

	public getRef<T extends Element = Element>(ref: string, all: true): T[];
	public getRef<T extends Element = Element>(ref: string, all?: false): T | null;
	public getRef<T extends Element = Element>(ref: string, all = false): T | T[] | null {
		const selector = `[data-ref="${ref}"]`;
		if (all) {
			return Array.from(this.querySelectorAll(selector)) as T[];
		}
		return (this.querySelector(selector) as T) ?? null;
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
