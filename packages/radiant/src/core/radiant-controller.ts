import { render as renderJsx, type JsxRenderable, type SubscribableJsxValueWithAccess } from '@ecopages/jsx';
import { createReactiveComputed, createReactiveWatcher, type ReactiveComputed } from './reactivity-adapter';
import type { SsrSerializableContextProvider } from '../context/context-provider';
import type { UnknownContext } from '../context/types';
import { ensureLegacyHostReady } from '../decorators/legacy/host-readiness';
import { ReactiveHost, type ReactiveHostLike } from './reactive-host';
import type { ReactiveState } from './reactivity-contract';
import type {
	ReactiveBindingOption,
	ReactivePropertyOptions,
	ReactiveBindingValue,
	ReactiveBindings,
	ReactiveFieldOptions,
} from './reactive-prop-core';
import { HostSsrRegistry } from './host-ssr-registry';
import type { SsrSerializableHydrationBinding } from './ssr-hydration-binding';
import { RenderScheduler } from './render-scheduler';
import { defaultValueForType } from '../utils/attribute-utils';
import { validateReactivePropertyDefault } from './reactive-prop-core';

type StringPropertyKey<Value> = Extract<keyof Value, string>;

/**
 * Attaches Radiant reactivity to an existing DOM element without defining a
 * custom element.
 *
 * `RadiantController` is the controller-host counterpart to `RadiantElement`.
 * It can enhance authored DOM, or it can take over the host's inner DOM by
 * overriding `render()`.
 *
 * When used with the controller registry, the attached host is typically an
 * element carrying `data-controller="..."`.
 *
 * @typeParam Bindings - Explicit internal bindable shape. Include only the
 * reactive keys that JSX bindings should accept.
 */
export class RadiantController<Bindings extends object = {}> implements ReactiveHostLike<Bindings> {
	public readonly host: Element;
	public readonly element: Element;
	public readonly bindings: ReactiveBindings<Bindings>;
	public readonly $: ReactiveBindings<Bindings>;

	private readonly reactiveHost: ReactiveHost<this, Bindings>;
	private connected = false;
	private readonly renderScheduler: RenderScheduler;
	private isSsrLifecycle = false;
	private readonly hostSsrRegistry = new HostSsrRegistry();
	private renderSignal?: ReactiveComputed<JsxRenderable>;
	private readonly renderWatcher = createReactiveWatcher(() => {
		this.requestUpdate();
	});

	constructor(host: Element) {
		this.host = host;
		this.element = host;
		this.reactiveHost = new ReactiveHost<this, Bindings>(
			this,
			{
				defineProperty: (target, property, descriptor) => Object.defineProperty(target, property, descriptor),
				hasProperty: (target, property) => property in target,
				readProperty: (target, property) => (target as Record<string, unknown>)[property],
			},
			() => this.shouldAutoBindReactiveMembers(),
		);
		this.bindings = this.reactiveHost.bindings;
		this.$ = this.reactiveHost.$;
		this.renderScheduler = new RenderScheduler({
			canFlush: () => this.connected && !this.renderScheduler.rendering,
			commit: () => {
				const renderTarget = this.getRenderTarget();

				if (!renderTarget) {
					return;
				}

				renderJsx(this.resolveTrackedRenderOutput(), renderTarget);
			},
		});
		ensureLegacyHostReady(this, 'construct');
	}

	/**
	 * Connects the controller to its host and starts reactive subscriptions.
	 *
	 * If the controller owns a render lifecycle by overriding `render()`, the
	 * first update runs immediately after connection.
	 */
	public connect(): void {
		ensureLegacyHostReady(this, 'connect');
		this.connected = true;
		this.reactiveHost.connectHost();

		if (this.shouldRunRenderLifecycle()) {
			this.update();
		}

		this.reactiveHost.flushPostSyncCallbacks();
	}

	/**
	 * Runs controller lifecycle work in SSR mode so `connect()` skips the client
	 * render/update path even when subclasses override it.
	 */
	public runWithSsrLifecycle<T>(work: () => T): T {
		this.isSsrLifecycle = true;

		try {
			return work();
		} finally {
			this.isSsrLifecycle = false;
		}
	}

	/**
	 * Disconnects the controller from its host and tears down reactive work.
	 */
	public disconnect(): void {
		this.connected = false;
		this.disconnectRenderWatcher();
		this.reactiveHost.disconnectHost();
	}

	public get isConnected(): boolean {
		return this.connected;
	}

	/**
	 * Returns the JSX tree rendered into the attached host.
	 *
	 * The base implementation renders nothing. Override this method when the
	 * controller should own the host's inner DOM instead of only enhancing
	 * authored markup.
	 */
	public render(): JsxRenderable {
		return null;
	}

	/**
	 * Schedules a render pass for render-owning controllers.
	 *
	 * Multiple calls in the same microtask are coalesced into a single update.
	 */
	public requestUpdate(): void {
		if (!this.shouldRunRenderLifecycle()) {
			return;
		}

		this.renderScheduler.requestUpdate();
	}

	/**
	 * Flushes the current render output into the attached host element.
	 *
	 * This is a no-op unless the controller overrides `render()`.
	 */
	public update(): void {
		if (!this.shouldRunRenderLifecycle()) {
			return;
		}

		if (!this.getRenderTarget()) {
			return;
		}

		this.renderScheduler.markPending();
		this.renderScheduler.flush();
	}

	/**
	 * Returns a subscribable JSX binding for a selected reactive member.
	 */
	public bind<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValueWithAccess<ReactiveBindingValue<Bindings, Property>> {
		return this.reactiveHost.getReactiveBinding(property);
	}

	/**
	 * Returns the cached binding object for a selected reactive member.
	 */
	public getReactiveBinding<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValueWithAccess<ReactiveBindingValue<Bindings, Property>> {
		return this.reactiveHost.getReactiveBinding(property);
	}

	/**
	 * Defines a reactive field directly on the controller instance.
	 */
	public createReactiveField<T>(propertyName: string, initialValue: T, options: ReactiveFieldOptions = {}): void {
		this.reactiveHost.createReactiveField(propertyName, initialValue, options);
	}

	/**
	 * Defines a controller prop backed by the attached host element's property
	 * channel instead of attribute serialization.
	 *
	 * This gives controller-based integrations the same reactive field surface as
	 * `@prop(...)` on `RadiantElement`, while allowing external code to assign
	 * structured values such as arrays or objects directly on `controller.host`.
	 */
	public createReactiveProp<T = unknown>(propertyName: string, options: ReactivePropertyOptions<T>): void {
		const { type, defaultValue, bind } = options;

		validateReactivePropertyDefault(type, defaultValue);

		const hostPropertyBridge = new ControllerHostPropertyBridge<T>(this.host, this, propertyName);
		const initialHostValue = hostPropertyBridge.getInitialValue();
		const initialValue = (initialHostValue ?? defaultValue ?? defaultValueForType(type)) as T;

		const signal = this.reactiveHost.createReactiveMember(propertyName, initialValue);

		this.reactiveHost.defineReactiveAccessor(propertyName, { bind, signal });

		hostPropertyBridge.install();

		this.registerCleanupCallback(() => {
			hostPropertyBridge.restore();
		});
	}

	/**
	 * Defines a JSX binding companion such as `$count` for a reactive member.
	 */
	public defineReactiveBinding(property: string, bind: ReactiveBindingOption = true): void {
		this.reactiveHost.defineReactiveBinding(property, bind);
	}

	public notifyUpdate(changedProperty: string, oldValue: unknown, value: unknown): void {
		this.reactiveHost.notifyUpdate(changedProperty, oldValue, value);
	}

	public registerUpdateCallback(property: string, update: () => void): () => void {
		return this.reactiveHost.registerUpdateCallback(property, update);
	}

	/**
	 * Notifies context decorators that a provider or consumer for `contextName`
	 * finished connecting on this controller host.
	 *
	 * Controllers currently rely on the shared client-side context event flow, so
	 * the base implementation does not need extra bookkeeping here.
	 */
	public connectedContextCallback(_contextName: UnknownContext): void {}

	/**
	 * Registers a decorated context provider on the controller host.
	 *
	 * Controller providers participate in the same client-side event-based context
	 * flow as `RadiantElement` providers. During SSR, the registered providers are
	 * also exposed to descendant consumers and hydration payload collection.
	 */
	public registerContextProvider(name: string, provider: SsrSerializableContextProvider): void {
		this.hostSsrRegistry.registerContextProvider(name, provider);
	}

	/**
	 * Registers a keyed SSR hydration binding for the controller host.
	 */
	public registerHydrationBinding(name: string, binding: SsrSerializableHydrationBinding): void {
		this.hostSsrRegistry.registerHydrationBinding(name, binding);
	}

	/**
	 * Returns SSR-visible context providers registered on this controller.
	 */
	public getSsrContextProviders(): SsrSerializableContextProvider[] {
		return this.hostSsrRegistry.getContextProviders();
	}

	/**
	 * Returns keyed hydration payload producers registered on this controller.
	 */
	public getSsrHydrationBindings(): SsrSerializableHydrationBinding[] {
		return this.hostSsrRegistry.getHydrationBindings();
	}

	public registerCleanupCallback(callback: () => void): void {
		this.reactiveHost.registerCleanupCallback(callback);
	}

	public registerConnectedCallback(callback: () => void): void {
		this.reactiveHost.registerConnectedCallback(callback);
	}

	public registerPostSyncCallback(callback: () => void): void {
		this.reactiveHost.registerPostSyncCallback(callback);
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

	public addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | AddEventListenerOptions,
	): void {
		this.host.addEventListener(type, listener, options);
	}

	public removeEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | EventListenerOptions,
	): void {
		this.host.removeEventListener(type, listener, options);
	}

	public dispatchEvent(event: Event): boolean {
		return this.host.dispatchEvent(event);
	}

	/**
	 * Finds one or more elements inside the attached host by `data-ref`.
	 *
	 * Prefer `@query(...)` for stable, decorator-backed refs and use `getRef(...)`
	 * for one-off lookups.
	 */
	public getRef<T extends Element = Element>(ref: string, all: true): T[];
	public getRef<T extends Element = Element>(ref: string, all?: false): T | null;
	public getRef<T extends Element = Element>(ref: string, all = false): T | T[] | null {
		const selector = `[data-ref="${ref}"]`;

		if (all) {
			return Array.from(this.host.querySelectorAll(selector)) as T[];
		}

		return (this.host.querySelector(selector) as T) ?? null;
	}

	protected shouldAutoBindReactiveMembers(): boolean {
		return true;
	}

	protected shouldRunRenderLifecycle(): boolean {
		return !this.isSsrLifecycle && this.render !== RadiantController.prototype.render;
	}

	private getRenderTarget(): HTMLElement | null {
		return this.host instanceof HTMLElement ? this.host : null;
	}

	private disconnectRenderWatcher(): void {
		if (!this.renderSignal) {
			return;
		}

		this.renderWatcher.unwatch(this.renderSignal);
		this.renderSignal = undefined;
	}

	private resolveTrackedRenderOutput(): JsxRenderable {
		const nextRenderSignal = createReactiveComputed(() => this.render());
		const output = nextRenderSignal.get();

		if (!this.connected) {
			return output;
		}

		if (this.renderSignal) {
			this.renderWatcher.unwatch(this.renderSignal);
		}

		this.renderSignal = nextRenderSignal;
		this.renderWatcher.watch(nextRenderSignal);
		return output;
	}
}

class ControllerHostPropertyBridge<T> {
	private readonly ownDescriptor: PropertyDescriptor | undefined;

	constructor(
		private readonly host: Element,
		private readonly controller: object,
		private readonly propertyName: string,
	) {
		this.ownDescriptor = Object.getOwnPropertyDescriptor(this.host, this.propertyName);
	}

	public getInitialValue(): T | undefined {
		return Reflect.get(this.host, this.propertyName) as T | undefined;
	}

	public install(): void {
		Object.defineProperty(this.host, this.propertyName, {
			get: () => Reflect.get(this.controller, this.propertyName),
			set: (newValue: T) => {
				Reflect.set(this.controller, this.propertyName, newValue);
			},
			enumerable: this.ownDescriptor?.enumerable ?? true,
			configurable: true,
		});
	}

	public restore(): void {
		const finalValue = Reflect.get(this.controller, this.propertyName);

		if (this.ownDescriptor) {
			Object.defineProperty(this.host, this.propertyName, this.ownDescriptor);

			if ('value' in this.ownDescriptor && this.ownDescriptor.writable) {
				Reflect.set(this.host, this.propertyName, finalValue);
			}

			return;
		}

		Reflect.deleteProperty(this.host, this.propertyName);

		try {
			Reflect.set(this.host, this.propertyName, finalValue);
		} catch {
			Object.defineProperty(this.host, this.propertyName, {
				value: finalValue,
				writable: true,
				enumerable: true,
				configurable: true,
			});
		}
	}
}
