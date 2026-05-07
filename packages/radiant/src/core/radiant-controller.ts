import { render as renderJsx, type JsxRenderable, type SubscribableJsxValue } from '@ecopages/jsx';
import { Computed, subtle } from '@ecopages/signals';
import type { UnknownContext } from '../context/types';
import { runLegacyInstanceInitializers } from '../decorators/legacy/instance-initializers';
import { ReactiveHost, type ReactiveHostLike } from './reactive-host';
import type {
	ReactivePropertyOptions,
	ReactiveBindingValue,
	ReactiveBindings,
	ReactiveFieldOptions,
} from './radiant-element';
import type { ReactiveBindingOption } from './radiant-element';
import type { SsrSerializableHydrationBinding } from './ssr-hydration-binding';
import { defaultValueForType, isValueOfType } from '../utils/attribute-utils';

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
	private isRendering = false;
	private isRenderScheduled = false;
	private isSsrLifecycle = false;
	private needsRender = false;
	private renderSignal?: Computed<JsxRenderable>;
	private readonly renderWatcher = new subtle.Watcher(() => {
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
		runLegacyInstanceInitializers(this);
	}

	/**
	 * Connects the controller to its host and starts reactive subscriptions.
	 *
	 * If the controller owns a render lifecycle by overriding `render()`, the
	 * first update runs immediately after connection.
	 */
	public connect(): void {
		this.connected = true;
		this.reactiveHost.connectHost();

		if (this.shouldRunRenderLifecycle()) {
			this.update();
		}
	}

	/**
	 * Connects the controller for server-side rendering without running the
	 * browser render/update lifecycle.
	 */
	public connectForSsrRender(): void {
		this.isSsrLifecycle = true;

		try {
			this.connect();
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

	/**
	 * Disconnects a controller that was attached through the SSR-only lifecycle.
	 */
	public disconnectForSsrRender(): void {
		this.disconnect();
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

		this.needsRender = true;

		if (this.isRenderScheduled) {
			return;
		}

		this.isRenderScheduled = true;

		queueMicrotask(() => {
			this.isRenderScheduled = false;

			if (!this.needsRender) {
				return;
			}

			this.update();
		});
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

		const renderTarget = this.getRenderTarget();

		if (!renderTarget) {
			return;
		}

		this.needsRender = true;

		if (!this.connected || this.isRendering) {
			return;
		}

		while (this.needsRender) {
			this.needsRender = false;
			this.isRendering = true;

			try {
				renderJsx(this.resolveTrackedRenderOutput(), renderTarget);
			} finally {
				this.isRendering = false;
			}
		}
	}

	/**
	 * Returns a subscribable JSX binding for a selected reactive member.
	 */
	public bind<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>> {
		return this.reactiveHost.bind(property);
	}

	/**
	 * Returns the cached binding object for a selected reactive member.
	 */
	public getReactiveBinding<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>> {
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

		if (defaultValue !== undefined && !isValueOfType(type, defaultValue)) {
			throw new Error(`defaultValue does not match the expected type for ${type.name}`);
		}

		const ownDescriptor = Object.getOwnPropertyDescriptor(this.host, propertyName);
		const hostRecord = this.host as unknown as Record<PropertyKey, unknown>;
		const initialHostValue = hostRecord[propertyName] as T | undefined;
		let currentValue = (initialHostValue ?? defaultValue ?? defaultValueForType(type)) as T;

		this.reactiveHost.defineReactiveAccessor(propertyName, {
			bind,
			getValue: () => currentValue,
			setValue: (newValue: T) => {
				currentValue = newValue;
			},
			notifyInitialValue: currentValue,
		});

		Object.defineProperty(this.host, propertyName, {
			get: () => (this as Record<PropertyKey, unknown>)[propertyName],
			set: (newValue: T) => {
				(this as Record<PropertyKey, unknown>)[propertyName] = newValue;
			},
			enumerable: ownDescriptor?.enumerable ?? true,
			configurable: true,
		});

		this.registerCleanupCallback(() => {
			const finalValue = (this as Record<PropertyKey, unknown>)[propertyName];

			if (ownDescriptor) {
				Object.defineProperty(this.host, propertyName, ownDescriptor);

				if ('value' in ownDescriptor && ownDescriptor.writable) {
					hostRecord[propertyName] = finalValue;
				}

				return;
			}

			delete hostRecord[propertyName];

			try {
				hostRecord[propertyName] = finalValue;
			} catch {
				Object.defineProperty(this.host, propertyName, {
					value: finalValue,
					writable: true,
					enumerable: true,
					configurable: true,
				});
			}
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

	public registerUpdateCallback(property: string, update: (...rest: any[]) => any): () => void {
		return this.reactiveHost.registerUpdateCallback(property, update);
	}

	public connectedContextCallback(_contextName: UnknownContext): void {}

	public registerContextProvider(_name: string, _provider: unknown): void {
		// Controller context support is currently client-only.
	}

	public registerHydrationBinding(_name: string, _binding: SsrSerializableHydrationBinding): void {}

	public registerCleanupCallback(callback: () => void): void {
		this.reactiveHost.registerCleanupCallback(callback);
	}

	public registerConnectedCallback(callback: () => void): void {
		this.reactiveHost.registerConnectedCallback(callback);
	}

	public registerReactiveDependencyReader(property: string, read: () => unknown): void {
		this.reactiveHost.registerReactiveDependencyReader(property, read);
	}

	public trackReactiveRead(property: string): void {
		this.reactiveHost.trackReactiveRead(property);
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
		const nextRenderSignal = new Computed(() => this.render());
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
