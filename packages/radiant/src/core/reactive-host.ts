import { createSubscribableJsxValue, type SubscribableJsxValue } from '@ecopages/jsx';
import { trackReactiveDependency, type ReactiveDependencyNode, type ReactiveSubscriber } from './reactivity-adapter';
import type {
	ReactiveBindingOption,
	ReactiveBindingValue,
	ReactiveBindings,
	ReactiveFieldOptions,
} from './reactive-prop-core';
import type { SsrSerializableHydrationBinding } from './ssr-hydration-binding';

type StringPropertyKey<Value> = Extract<keyof Value, string>;
type ReactiveDependencyReader = () => unknown;

type ReactiveHostAccess<Host extends object> = {
	defineProperty(target: object, property: string, descriptor: PropertyDescriptor): void;
	getBindingTarget?(host: Host): object;
	hasProperty(host: Host, property: string): boolean;
	readProperty(host: Host, property: string): unknown;
};

type ReactiveField<T = unknown> = {
	name: string;
	value: T;
	initialValue: T;
};

type ReactiveAccessorOptions<T> = {
	bind?: ReactiveBindingOption;
	getValue: () => T | undefined;
	setValue: (value: T) => void;
	notifyInitialValue?: T;
};

/**
 * Shared reactive-host contract consumed by decorators and host adapters.
 *
 * `RadiantElement` and `RadiantController` both implement this surface so the
 * decorator layer can define fields, bindings, context reactions, and tracked
 * reads without depending on a specific host class.
 */
export interface ReactiveHostLike<Bindings extends object = {}> {
	readonly bindings: ReactiveBindings<Bindings>;
	readonly $: ReactiveBindings<Bindings>;
	bind<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>>;
	getReactiveBinding<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>>;
	createReactiveField<T>(propertyName: string, initialValue: T, options?: ReactiveFieldOptions): void;
	defineReactiveBinding(property: string, bind?: ReactiveBindingOption): void;
	notifyUpdate(changedProperty: string, oldValue: unknown, value: unknown): void;
	registerCleanupCallback(callback: () => void): void;
	registerConnectedCallback(callback: () => void): void;
	registerHydrationBinding(name: string, binding: SsrSerializableHydrationBinding): void;
	registerReactiveDependencyReader(property: string, read: () => unknown): void;
	trackReactiveRead(property: string): void;
}

/**
 * Internal dependency node that bridges Radiant host members into the signals
 * tracking graph.
 */
class ReactiveHostDependency implements ReactiveDependencyNode {
	private readonly subscribers = new Set<ReactiveSubscriber<unknown>>();
	private readonly watcherListeners = new Set<() => void>();
	private version = 0;

	constructor(private readonly read: ReactiveDependencyReader) {}

	public get(): unknown {
		trackReactiveDependency(this);
		return this.read();
	}

	public subscribe(notify: ReactiveSubscriber<unknown>): () => void {
		this.subscribers.add(notify);

		return () => {
			this.subscribers.delete(notify);
		};
	}

	public addWatcher(notify: () => void): () => void {
		this.watcherListeners.add(notify);

		return () => {
			this.watcherListeners.delete(notify);
		};
	}

	public getVersion(): number {
		return this.version;
	}

	public notify(nextValue: unknown): void {
		this.version += 1;
		let watcherError: unknown;

		try {
			this.notifyWatchers();
		} catch (error) {
			watcherError = error;
		}

		this.publish(nextValue);

		if (watcherError) {
			throw watcherError;
		}
	}

	private publish(nextValue: unknown): void {
		for (const subscriber of this.subscribers) {
			subscriber(nextValue);
		}
	}

	private notifyWatchers(): void {
		const errors: unknown[] = [];

		for (const listener of this.watcherListeners) {
			try {
				listener();
			} catch (error) {
				errors.push(error);
			}
		}

		if (errors.length === 1) {
			throw errors[0];
		}

		if (errors.length > 1) {
			throw new AggregateError(errors, 'Multiple reactive dependency notifications failed.');
		}
	}
}

function isSignalLikeBindingValue(value: unknown): value is { get(): unknown } {
	return typeof value === 'object' && value !== null && typeof (value as { get?: unknown }).get === 'function';
}

/**
 * Shared reactivity engine used by both `RadiantElement` and
 * `RadiantController`.
 *
 * This class owns three pieces of shared behavior:
 *
 * - defining reactive accessors on the host object
 * - exposing cached JSX bindings such as `bindings.count` and `$count`
 * - publishing tracked updates into the signals graph and update callbacks
 *
 * Host-specific concerns such as attribute reflection, render lifecycles, and
 * custom-element APIs stay in the outer host classes.
 */
export class ReactiveHost<Host extends object, Bindings extends object = {}> implements ReactiveHostLike<Bindings> {
	public readonly bindings: ReactiveBindings<Bindings>;
	public readonly $: ReactiveBindings<Bindings>;

	private reactiveFields = new Map<string, ReactiveField>();
	private reactiveDependencies = new Map<string, ReactiveHostDependency>();
	private reactiveDependencyReaders = new Map<string, ReactiveDependencyReader>();
	private reactiveBindings = new Map<string, SubscribableJsxValue>();
	private updateCallbacks = new Map<string, Set<(...rest: any[]) => any>>();
	private onConnectedCallbacks: (() => void)[] = [];
	private onDisconnectedCallback: (() => void)[] = [];

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
	 * Publishes a reactive member change to tracked dependencies and explicit
	 * update callbacks.
	 */
	public notifyUpdate(changedProperty: string, oldValue: unknown, value: unknown): void {
		if (oldValue === value) {
			return;
		}

		this.reactiveDependencies.get(changedProperty)?.notify(value);
		const updates = this.updateCallbacks.get(changedProperty);

		if (updates) {
			for (const update of updates) {
				update();
			}
		}
	}

	/**
	 * Registers a callback that should run when the outer host disconnects.
	 */
	public registerCleanupCallback(callback: () => void): void {
		this.onDisconnectedCallback.push(callback);
	}

	/**
	 * Registers a callback that should run whenever the outer host connects.
	 */
	public registerConnectedCallback(callback: () => void): void {
		this.onConnectedCallbacks.push(callback);
	}

	/**
	 * Placeholder hydration hook so shared decorators can target both host types.
	 *
	 * `ReactiveHost` itself does not persist hydration bindings; concrete hosts
	 * such as `RadiantElement` can override this behavior at the outer layer.
	 */
	public registerHydrationBinding(_name: string, _binding: SsrSerializableHydrationBinding): void {}

	/**
	 * Registers a raw reader for a reactive member so tracked dependency reads do
	 * not need to go back through the public accessor.
	 */
	public registerReactiveDependencyReader(property: string, read: ReactiveDependencyReader): void {
		this.reactiveDependencyReaders.set(property, read);
	}

	/**
	 * Registers a callback that runs whenever a named reactive member changes.
	 *
	 * Returns a disposer that removes the callback.
	 */
	public registerUpdateCallback(property: string, update: (...rest: any[]) => any): () => void {
		if (!this.updateCallbacks.has(property)) {
			this.updateCallbacks.set(property, new Set());
		}

		const callbacks = this.updateCallbacks.get(property)!;
		callbacks.add(update);

		return () => {
			callbacks.delete(update);

			if (callbacks.size === 0) {
				this.updateCallbacks.delete(property);
			}
		};
	}

	/**
	 * Returns the cached JSX binding object for a named reactive member.
	 */
	public getReactiveBinding<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>> {
		const cachedBinding = this.reactiveBindings.get(property);

		if (cachedBinding) {
			return cachedBinding as SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>>;
		}

		const binding = createSubscribableJsxValue<ReactiveBindingValue<Bindings, Property>>({
			getValue: () => this.readReactiveBindingValue(property) as ReactiveBindingValue<Bindings, Property>,
			subscribe: (notify) =>
				this.registerUpdateCallback(property, () => {
					notify(this.readReactiveBindingValue(property) as ReactiveBindingValue<Bindings, Property>);
				}),
		});

		this.reactiveBindings.set(property, binding);
		return binding;
	}

	/**
	 * Short alias for `getReactiveBinding(...)`.
	 */
	public bind<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>> {
		return this.getReactiveBinding(property) as SubscribableJsxValue<ReactiveBindingValue<Bindings, Property>>;
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
	 * Records a dependency read for the named reactive member.
	 */
	public trackReactiveRead(property: string): void {
		trackReactiveDependency(this.getReactiveDependency(property));
	}

	/**
	 * Defines a reactive getter/setter pair on the host and wires it into
	 * bindings, dependency tracking, and update notifications.
	 */
	public defineReactiveAccessor<T>(propertyName: string, options: ReactiveAccessorOptions<T>): void {
		const bind = options.bind ?? this.shouldAutoBind();

		this.defineReactiveBinding(propertyName, bind);
		this.registerReactiveDependencyReader(propertyName, options.getValue);

		this.access.defineProperty(this.host, propertyName, {
			get: () => {
				this.trackReactiveRead(propertyName);
				return options.getValue();
			},
			set: (newValue: T) => {
				const oldValue = options.getValue();

				if (oldValue === newValue) {
					return;
				}

				options.setValue(newValue);
				this.notifyUpdate(propertyName, oldValue, newValue);
			},
			enumerable: true,
			configurable: true,
		});

		if (options.notifyInitialValue !== undefined) {
			this.notifyUpdate(propertyName, undefined, options.notifyInitialValue);
		}
	}

	/**
	 * Defines a controller- or element-local reactive field with optional JSX
	 * binding exposure.
	 */
	public createReactiveField<T>(propertyName: string, initialValue: T, options: ReactiveFieldOptions = {}): void {
		const reactiveField: ReactiveField<T> = {
			name: propertyName,
			value: initialValue,
			initialValue,
		};

		this.reactiveFields.set(propertyName, reactiveField);

		this.defineReactiveAccessor(propertyName, {
			bind: options.bind,
			getValue: () => this.reactiveFields.get(propertyName)?.value as T | undefined,
			setValue: (newValue: T) => {
				this.reactiveFields.set(propertyName, { ...reactiveField, value: newValue });
			},
			notifyInitialValue: initialValue,
		});
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

	private getReactiveDependency(property: string): ReactiveHostDependency {
		const cachedDependency = this.reactiveDependencies.get(property);

		if (cachedDependency) {
			return cachedDependency;
		}

		const dependency = new ReactiveHostDependency(() => this.readReactiveDependencyValue(property));
		this.reactiveDependencies.set(property, dependency);
		return dependency;
	}

	private readReactiveDependencyValue(property: string): unknown {
		const reader = this.reactiveDependencyReaders.get(property);

		if (reader) {
			return reader();
		}

		return this.readReactiveBindingValue(property as StringPropertyKey<Bindings>);
	}

	private readReactiveBindingValue<Property extends StringPropertyKey<Bindings>>(property: Property): unknown {
		const value = this.access.readProperty(this.host, property);

		if (isSignalLikeBindingValue(value)) {
			return value.get();
		}

		return value;
	}
}
