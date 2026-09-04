import type { JsxBindingSourceValue, SubscribableJsxValueWithAccess } from '@ecopages/jsx';
import { adaptReactiveStateToJsxBinding } from './reactive-binding-adapter';
import { getReactiveRuntime } from './reactivity-runtime';
import type { ReactiveState } from './reactivity-contract';
import type {
	ReactiveAccessorDefinition,
	ReactiveBindingOption,
	ReactiveBindingValue,
	ReactiveBindings,
	ReactiveFieldOptions,
} from './reactive-prop-core';

type StringPropertyKey<Value> = Extract<keyof Value, string>;

type UpdateSubscription = {
	signal: ReactiveState<unknown>;
	unsubscribe: () => void;
};

/**
 * Shared reactive-host contract consumed by decorators and host adapters.
 *
 * `RadiantElement` and `RadiantController` both implement this surface so the
 * decorator layer can define fields, bindings, and context reactions without
 * depending on a specific host class.
 */
export interface ReactiveHostLike<Bindings extends object = {}> {
	readonly bindings: ReactiveBindings<Bindings>;
	readonly $: ReactiveBindings<Bindings>;
	bind<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValueWithAccess<ReactiveBindingValue<Bindings, Property>>;
	getReactiveBinding<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValueWithAccess<ReactiveBindingValue<Bindings, Property>>;
	getReactiveMember<T = unknown>(propertyName: string): ReactiveState<T> | undefined;
	createReactiveField<T>(propertyName: string, initialValue: T, options?: ReactiveFieldOptions): void;
	createReactiveMember<T>(propertyName: string, initialValue: T): ReactiveState<T>;
	registerReactiveMember<T>(propertyName: string, signal: ReactiveState<T>): void;
	defineReactiveBinding(property: string, bind?: ReactiveBindingOption): void;
	notifyUpdate(changedProperty: string, oldValue: unknown, value: unknown): void;
	registerCleanupCallback(callback: () => void): void;
	registerConnectedCallback(callback: () => void): void;
	registerPostSyncCallback(callback: () => void): void;
	registerUpdateCallback(property: string, update: () => void): () => void;
}

/**
 * Shared reactivity engine used by both `RadiantElement` and
 * `RadiantController`.
 *
 * Every reactive host member owns a single signals-backed `ReactiveState`
 * (a `State` for fields/props/attributes, or a user `signal()` for the signal
 * decorator). The jsx binding, `onUpdated` callbacks, and `ReactiveComputed`
 * tracking all read that one state directly, so there is no parallel
 * notification bus or dependency shim.
 *
 * Host-specific concerns such as attribute reflection, render lifecycles, and
 * custom-element APIs stay in the outer host classes.
 */
export class ReactiveHost<Host extends object, Bindings extends object = {}> {
	public readonly bindings: ReactiveBindings<Bindings>;
	public readonly $: ReactiveBindings<Bindings>;

	private reactiveMembers = new Map<string, ReactiveState<unknown>>();
	private jsxBindings = new Map<string, SubscribableJsxValueWithAccess<JsxBindingSourceValue>>();
	/** `onUpdated` callbacks keyed by property; values track the subscribed signal so replacements can resubscribe. */
	private updateCallbacks = new Map<string, Map<() => void, UpdateSubscription | undefined>>();
	private onConnectedCallbacks: (() => void)[] = [];
	private onDisconnectedCallback: (() => void)[] = [];
	private postSyncCallbacks: (() => void)[] = [];

	constructor(
		private readonly host: Host,
		private readonly access: ReactiveHostAccess<Host>,
		private readonly shouldAutoBind: () => boolean,
	) {
		const bindingNamespace = this.createReactiveBindingNamespace();
		this.bindings = bindingNamespace;
		this.$ = bindingNamespace;
	}

	/**
	 * Runs all connection callbacks registered by decorators or host adapters.
	 */
	public connectHost(): void {
		for (const callback of this.onConnectedCallbacks) {
			callback();
		}
	}

	/**
	 * Runs all cleanup callbacks registered for host disconnect.
	 */
	public disconnectHost(): void {
		for (const cleanup of this.onDisconnectedCallback) {
			cleanup();
		}
	}

	/**
	 * Registers a callback that should run on host disconnect.
	 */
	public registerCleanupCallback(callback: () => void): void {
		this.onDisconnectedCallback.push(callback);
	}

	/**
	 * Registers a callback that should run whenever the host connects.
	 */
	public registerConnectedCallback(callback: () => void): void {
		this.onConnectedCallbacks.push(callback);
	}

	/**
	 * Registers a callback that runs after attribute catch-up (and the initial
	 * hydrate/update when the host owns `render()`), before user `onConnected()`.
	 *
	 * Used by `@bindTo` so the first paint can see parent-authored or just-rendered
	 * `data-ref` nodes. Callbacks persist across disconnect and run again on reconnect.
	 */
	public registerPostSyncCallback(callback: () => void): void {
		this.postSyncCallbacks.push(callback);
	}

	/**
	 * Runs every post-sync callback registered on this host.
	 */
	public flushPostSyncCallbacks(): void {
		for (const callback of this.postSyncCallbacks) {
			callback();
		}
	}

	/**
	 * Fires the `onUpdated` callbacks registered for a member.
	 *
	 * This is the only remaining use of the update-callback bus: an initial
	 * emit for members that want one (currently `@prop`). Change notifications
	 * flow through the member `State`'s own subscription, not through here.
	 */
	public notifyUpdate(changedProperty: string, _oldValue: unknown, _value: unknown): void {
		const callbacks = this.updateCallbacks.get(changedProperty);

		if (!callbacks) {
			return;
		}

		for (const update of [...callbacks.keys()]) {
			update();
		}
	}

	/**
	 * Returns the member state registered under `propertyName`, if any.
	 */
	public getReactiveMember<T = unknown>(propertyName: string): ReactiveState<T> | undefined {
		return this.reactiveMembers.get(propertyName) as ReactiveState<T> | undefined;
	}

	/**
	 * Creates a new reactive member state and registers it under `propertyName`.
	 */
	public createReactiveMember<T>(propertyName: string, initialValue: T): ReactiveState<T> {
		const signal = getReactiveRuntime().createState(initialValue) as ReactiveState<T>;
		this.registerMember(propertyName, signal as ReactiveState<unknown>);
		return signal;
	}

	/**
	 * Registers an externally-owned reactive member state (used by the
	 * `signal()` decorator, whose state is a user-provided signals `Signal`).
	 */
	public registerReactiveMember<T>(propertyName: string, signal: ReactiveState<T>): void {
		this.registerMember(propertyName, signal as ReactiveState<unknown>);
	}

	/**
	 * Stores the member state and subscribes any `onUpdated` callbacks that were
	 * registered before the member existed (decorator initializer ordering).
	 */
	private registerMember(propertyName: string, signal: ReactiveState<unknown>): void {
		this.reactiveMembers.set(propertyName, signal);
		this.jsxBindings.delete(propertyName);

		const callbacks = this.updateCallbacks.get(propertyName);

		if (callbacks) {
			for (const update of callbacks.keys()) {
				this.subscribeCallback(propertyName, update);
			}
		}
	}

	/**
	 * Subscribes an `onUpdated` callback to the member state if the member is
	 * already registered.
	 *
	 * Re-subscribes only when the member signal identity changes (for example
	 * `registerReactiveMember` replacing a previous state). Same-signal calls
	 * keep the existing subscription.
	 */
	private subscribeCallback(propertyName: string, update: () => void): void {
		const callbacks = this.updateCallbacks.get(propertyName);
		const signal = this.reactiveMembers.get(propertyName);

		if (!callbacks || !signal) {
			return;
		}

		const current = callbacks.get(update);

		if (current?.signal === signal) {
			return;
		}

		current?.unsubscribe();
		callbacks.set(update, {
			signal,
			unsubscribe: signal.subscribe(() => update()),
		});
	}

	/**
	 * Returns the jsx binding for a named reactive member.
	 *
	 * The binding is adapted from the member `State` once and cached so derived
	 * transforms (`map`, member access) share a stable source identity.
	 */
	public getReactiveBinding<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValueWithAccess<ReactiveBindingValue<Bindings, Property>> {
		const key = property as string;
		const cached = this.jsxBindings.get(key);

		if (cached) {
			return cached as SubscribableJsxValueWithAccess<ReactiveBindingValue<Bindings, Property>>;
		}

		const signal = this.reactiveMembers.get(key);

		if (!signal) {
			throw new Error(`No reactive binding registered for "${String(property)}".`);
		}

		const binding = adaptReactiveStateToJsxBinding(
			signal as ReactiveState<ReactiveBindingValue<Bindings, Property>>,
		);

		this.jsxBindings.set(key, binding);
		return binding;
	}

	/**
	 * Registers an `onUpdated`-style callback for a named reactive member.
	 *
	 * Change notifications flow through the member `State`'s own subscription
	 * (D1). The callback is also kept in the update-callback bus so an initial
	 * emit (currently `@prop`) can still reach it once after definition.
	 */
	public registerUpdateCallback(property: string, update: () => void): () => void {
		let callbacks = this.updateCallbacks.get(property);

		if (!callbacks) {
			callbacks = new Map();
			this.updateCallbacks.set(property, callbacks);
		}

		if (!callbacks.has(update)) {
			callbacks.set(update, undefined);
		}

		this.subscribeCallback(property, update);

		return () => {
			const perProperty = this.updateCallbacks.get(property);
			perProperty?.get(update)?.unsubscribe();
			perProperty?.delete(update);

			if (perProperty && perProperty.size === 0) {
				this.updateCallbacks.delete(property);
			}
		};
	}

	/**
	 * Defines a stable binding companion property such as `$count` on the host or
	 * its chosen binding target.
	 */
	public defineReactiveBinding(property: string, bind: ReactiveBindingOption = true): void {
		const bindingPropertyName = typeof bind === 'string' ? bind : bind ? `$${property}` : undefined;
		const bindingTarget = this.access.getBindingTarget?.(this.host) ?? this.host;

		if (!bindingPropertyName || this.access.hasProperty(this.host, bindingPropertyName)) {
			return;
		}

		this.access.defineProperty(bindingTarget, bindingPropertyName, {
			get: () => this.getReactiveBinding(property as StringPropertyKey<Bindings>),
			enumerable: false,
			configurable: true,
		});
	}

	/**
	 * Defines a reactive getter/setter pair on the host backed by a member
	 * `State`, and wires it into the jsx binding namespace.
	 */
	public defineReactiveAccessor<T>(propertyName: string, options: ReactiveAccessorDefinition<T>): void {
		const bind = options.bind ?? this.shouldAutoBind();

		this.defineReactiveBinding(propertyName, bind);

		this.access.defineProperty(this.host, propertyName, {
			get: () => options.signal.get(),
			set: (newValue: T) => {
				options.signal.set(newValue);
				options.onSet?.(newValue);
			},
			enumerable: true,
			configurable: true,
		});
	}

	/**
	 * Defines a controller- or element-local reactive field with optional JSX
	 * binding exposure.
	 */
	public createReactiveField<T>(propertyName: string, initialValue: T, options: ReactiveFieldOptions = {}): void {
		const existing = this.reactiveMembers.get(propertyName) as ReactiveState<T> | undefined;
		const signal = existing ?? this.createReactiveMember(propertyName, initialValue);

		if (existing && initialValue !== undefined) {
			signal.set(initialValue);
		}

		this.defineReactiveAccessor(propertyName, { bind: options.bind, signal });

		if (!options.suppressInitialNotify) {
			this.notifyUpdate(propertyName, undefined, signal.get());
		}
	}

	private createReactiveBindingNamespace(): ReactiveBindings<Bindings> {
		return new Proxy(Object.create(null) as ReactiveBindings<Bindings>, {
			get: (_target, property) => {
				if (typeof property !== 'string') {
					return undefined;
				}

				return this.getReactiveBinding(property as StringPropertyKey<Bindings>);
			},
		}) as ReactiveBindings<Bindings>;
	}
}

type ReactiveHostAccess<Host extends object> = {
	defineProperty(target: object, property: string, descriptor: PropertyDescriptor): void;
	getBindingTarget?(host: Host): object;
	hasProperty(host: Host, property: string): boolean;
	readProperty(host: Host, property: string): unknown;
};
