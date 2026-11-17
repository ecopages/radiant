import { render as renderJsx, type JsxRenderable, type SubscribableJsxValueWithAccess } from '@ecopages/jsx';
import { TrackedRender } from './tracked-render';
import type { UnknownContext } from '../context/types';
import { ensureLegacyHostReady } from '../decorators/legacy/host-readiness';
import { REACTIVE_HOST, ReactiveHost, type ReactiveHostInternals, type ReactiveHostLike } from './reactive-host';
import type { ReactiveState, ReadonlyReactiveState } from './reactivity-contract';
import {
	resolveReactiveDefault,
	validateReactivePropertyDefault,
	type ReactivePropertyOptions,
	type ReactiveBindingValue,
	type ReactiveBindings,
	type ReactiveFieldOptions,
} from './reactive-prop-core';
import { markControllerRoot, resolvePart, resolveParts, unmarkControllerRoot } from './parts';
import { UpdateCycle } from './update-cycle';

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
	private readonly updateCycle: UpdateCycle;
	private isSsrLifecycle = false;
	private readonly trackedRender: TrackedRender<JsxRenderable>;

	constructor(host: Element) {
		this.host = host;
		this.element = host;
		this.updateCycle = new UpdateCycle({
			canFlush: () => this.connected,
			runCallbacks: (changed) => this.reactiveHost.runUpdatedCallbacks(changed),
			commit: () => {
				const renderTarget = this.getRenderTarget();

				if (!renderTarget) {
					return;
				}

				renderJsx(this.resolveTrackedRenderOutput(), renderTarget);
			},
			updated: (changed) => this.updated(changed),
		});
		this.reactiveHost = new ReactiveHost<this, Bindings>(
			this,
			{
				defineProperty: (target, property, descriptor) => Object.defineProperty(target, property, descriptor),
			},
			(propertyName) => this.updateCycle.markChanged(propertyName),
		);
		this.trackedRender = new TrackedRender<JsxRenderable>(
			() => this.requestUpdate(),
			this.reactiveHost.renderWarnings,
		);
		this.bindings = this.reactiveHost.bindings;
		this.$ = this.reactiveHost.$;
		ensureLegacyHostReady(this, 'construct');
	}

	/**
	 * Connects the controller to its host and starts reactive subscriptions.
	 *
	 * @remarks Runs the first update cycle synchronously: batched `@onUpdated`
	 * callbacks for changes queued before connection, the first render when the
	 * controller overrides `render()`, `@bindTo`, then `updated(changed)`.
	 */
	public connect(): void {
		ensureLegacyHostReady(this, 'connect');
		this.connected = true;
		markControllerRoot(this.host, this);
		this.reactiveHost.connectHost();

		this.updateCycle.flush(() => {
			this.updateCycle.runCallbacks();

			if (this.shouldRunRenderLifecycle()) {
				this.update();
			}

			this.reactiveHost.flushPostSync();
		});
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
		unmarkControllerRoot(this.host, this);
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

		this.updateCycle.requestRender();
	}

	/**
	 * Runs the update cycle now: pending `@onUpdated` callbacks, the render when
	 * the controller overrides `render()`, then `updated()`.
	 *
	 * @remarks Called from inside a running cycle, it commits the render
	 * immediately and leaves the rest to that cycle.
	 */
	public update(): void {
		if (this.shouldRunRenderLifecycle()) {
			this.updateCycle.requestRender();
		}

		this.updateCycle.update();
	}

	/**
	 * Lifecycle hook invoked after each update cycle, once batched `@onUpdated`
	 * callbacks ran and any pending render committed.
	 *
	 * @param changed - Reactive members that changed during the cycle.
	 */
	protected updated(_changed: ReadonlySet<string>): void {}

	/** Resolves after the pending update cycle finishes; stays pending while disconnected with queued work. */
	public get updateComplete(): Promise<void> {
		return this.updateCycle.updateComplete;
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
		const { type, defaultValue, transform } = options;

		this.reactiveHost.getWritableMember(propertyName);
		validateReactivePropertyDefault(type, defaultValue, !!transform?.fromAttribute);

		const hostPropertyBridge = new ControllerHostPropertyBridge<T>(this.host, this, propertyName);
		const initialHostValue = hostPropertyBridge.getInitialValue();
		const rawInitial = initialHostValue ?? resolveReactiveDefault(options);
		const initialValue = (transform?.fromProperty ? transform.fromProperty(rawInitial) : rawInitial) as T;

		const signal = this.reactiveHost.adoptReactiveMember(propertyName, initialValue);

		this.reactiveHost.defineReactiveAccessor(propertyName, { signal, fromProperty: transform?.fromProperty });

		hostPropertyBridge.install();

		this.registerCleanupCallback(() => {
			hostPropertyBridge.restore();
		});
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

	/** Framework plumbing for decorators and SSR adapters; not part of the authoring API. */
	public get [REACTIVE_HOST](): ReactiveHostInternals {
		return this.reactiveHost;
	}

	public registerCleanupCallback(callback: () => void): void {
		this.reactiveHost.registerCleanupCallback(callback);
	}

	public registerConnectedCallback(callback: () => void): void {
		this.reactiveHost.registerConnectedCallback(callback);
	}

	public createReactiveMember<T>(propertyName: string, initialValue: T): ReactiveState<T> {
		return this.reactiveHost.createReactiveMember(propertyName, initialValue);
	}

	public registerReactiveMember<T>(propertyName: string, signal: ReadonlyReactiveState<T>): void {
		this.reactiveHost.registerReactiveMember(propertyName, signal);
	}

	public getReactiveMember<T = unknown>(propertyName: string): ReadonlyReactiveState<T> | undefined {
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
	 * Finds one or more elements inside the attached host by `data-ref`, among the parts the host owns: a nested
	 * Element Host's or attached Controller Host's same-named part is skipped. `all` returns document order.
	 *
	 * Prefer `@ref(...)` for decorator-backed parts and use `getRef(...)`
	 * for one-off lookups.
	 */
	public getRef<T extends Element = Element>(ref: string, all: true): T[];
	public getRef<T extends Element = Element>(ref: string, all?: false): T | null;
	public getRef<T extends Element = Element>(ref: string, all = false): T | T[] | null {
		return all ? resolveParts<T>(this.host, ref) : resolvePart<T>(this.host, ref);
	}

	protected shouldRunRenderLifecycle(): boolean {
		return !this.isSsrLifecycle && this.render !== RadiantController.prototype.render;
	}

	private getRenderTarget(): HTMLElement | null {
		return this.host instanceof HTMLElement ? this.host : null;
	}

	private disconnectRenderWatcher(): void {
		this.trackedRender.disconnect();
	}

	private resolveTrackedRenderOutput(): JsxRenderable {
		return this.trackedRender.evaluate(() => this.render(), this.connected);
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
