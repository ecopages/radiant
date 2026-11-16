import { HAS_PRE_UPGRADE_VALUE } from './pre-upgrade-value';
import type { JsxBindingSourceValue, SubscribableJsxValueWithAccess } from '@ecopages/jsx';
import { HostSsrRegistry } from './host-ssr-registry';
import { adaptReactiveStateToJsxBinding } from './reactive-binding-adapter';
import { state } from '@ecopages/signals';
import { RenderWarnings } from './render-warnings';
import type { ReactiveState, ReadonlyReactiveState } from './reactivity-contract';
import type {
	ReactiveAccessorDefinition,
	ReactiveBindingValue,
	ReactiveBindings,
	ReactiveFieldOptions,
} from './reactive-prop-core';

type StringPropertyKey<Value> = Extract<keyof Value, string>;

type UpdateSubscription = {
	signal: ReadonlyReactiveState<unknown>;
	unsubscribe: () => void;
};

/** Batched `@onUpdated` callback: runs once per changed batch when any of `keys` changed. */
export type UpdatedCallback = (changed: ReadonlySet<string>) => void;

type UpdatedRegistration = {
	keys: ReadonlySet<string>;
	callback: UpdatedCallback;
};

/**
 * Key under which `RadiantElement` and `RadiantController` expose their
 * {@link ReactiveHostInternals} to decorators and host adapters.
 */
export const REACTIVE_HOST: unique symbol = Symbol.for('@ecopages/radiant.reactiveHost');

/**
 * Framework plumbing of a host: decorator registration, SSR registries, and
 * initial update emits. Reached through {@link REACTIVE_HOST}, not the host's public API.
 */
export interface ReactiveHostInternals {
	readonly ssrRegistry: HostSsrRegistry;
	notifyUpdate(changedProperty: string, oldValue: unknown, value: unknown): void;
	/**
	 * Returns the writable member registered under `propertyName`, if any.
	 *
	 * @throws When the name is held by a read-only member, so a writable decorator
	 * fails loudly instead of calling a missing `set`.
	 */
	getWritableMember<T = unknown>(propertyName: string): ReactiveState<T> | undefined;
	/**
	 * Records that the host defines its own accessor for `propertyName`.
	 *
	 * @remarks For accessors defined outside {@link ReactiveHost.defineReactiveAccessor}, such as
	 * `@attr`'s. A read-only member may not replace the member behind a marked name.
	 */
	markFieldAccessor(propertyName: string): void;
	registerPostSync(callback: () => void): void;
	registerConnectSync(callback: () => void): void;
	registerUpdatedCallback(keys: readonly string[], callback: UpdatedCallback): () => void;
	flushPostSync(): void;
	flushConnectSync(): void;
}

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
	readonly [REACTIVE_HOST]: ReactiveHostInternals;
	bind<Property extends StringPropertyKey<Bindings>>(
		property: Property,
	): SubscribableJsxValueWithAccess<ReactiveBindingValue<Bindings, Property>>;
	getReactiveMember<T = unknown>(propertyName: string): ReadonlyReactiveState<T> | undefined;
	createReactiveField<T>(propertyName: string, initialValue: T, options?: ReactiveFieldOptions): void;
	createReactiveMember<T>(propertyName: string, initialValue: T): ReactiveState<T>;
	registerReactiveMember<T>(propertyName: string, signal: ReadonlyReactiveState<T>): void;
	/** Whether a value was assigned to the host under `propertyName` before it was upgraded; only elements can tell. */
	[HAS_PRE_UPGRADE_VALUE]?(propertyName: string): boolean;
	registerCleanupCallback(callback: () => void): void;
	registerConnectedCallback(callback: () => void): void;
	registerUpdateCallback(property: string, update: () => void): () => void;
}

/**
 * Shared reactivity engine used by both `RadiantElement` and
 * `RadiantController`.
 *
 * Every reactive host member owns a single signals-backed `ReactiveState`
 * (a `State` for fields/props/attributes, or a user `signal()` for the signal
 * decorator). The jsx binding, `@bindTo` writes, and `ReactiveComputed`
 * tracking read that one state directly. Every change is also reported to the
 * host update cycle, which runs batched `@onUpdated` callbacks once per turn.
 *
 * Host-specific concerns such as attribute reflection, render lifecycles, and
 * custom-element APIs stay in the outer host classes.
 */
export class ReactiveHost<Host extends object, Bindings extends object = {}> implements ReactiveHostInternals {
	public readonly bindings: ReactiveBindings<Bindings>;
	public readonly $: ReactiveBindings<Bindings>;
	public readonly ssrRegistry = new HostSsrRegistry();
	/** Development diagnostics for whole-render reads; absent in a production build. */
	public readonly renderWarnings?: RenderWarnings;

	private reactiveMembers = new Map<string, ReadonlyReactiveState<unknown>>();
	/** Names with a field accessor, which closes over the member it was defined with. */
	private accessorNames = new Set<string>();
	private jsxBindings = new Map<string, SubscribableJsxValueWithAccess<JsxBindingSourceValue>>();
	/** Synchronous per-member callbacks keyed by property; values track the subscribed signal so replacements can resubscribe. */
	private updateCallbacks = new Map<string, Map<() => void, UpdateSubscription | undefined>>();
	private updatedCallbacks: UpdatedRegistration[] = [];
	/** Change reports to the update cycle; held only while members are observed. */
	private changeSubscriptions = new Map<string, () => void>();
	/** Member values captured while unobserved, diffed when observation resumes. */
	private memberSnapshots = new Map<string, unknown>();
	private initializingReactiveFields = new Set<string>();
	private observing = false;
	private onConnectedCallbacks: (() => void)[] = [];
	private onDisconnectedCallback: (() => void)[] = [];
	private postSyncCallbacks: (() => void)[] = [];
	private connectSyncCallbacks: (() => void)[] = [];

	constructor(
		private readonly host: Host,
		private readonly access: ReactiveHostAccess,
		private readonly onMemberChanged: (propertyName: string) => void,
	) {
		const bindingNamespace = this.createReactiveBindingNamespace();
		this.bindings = bindingNamespace;
		this.$ = bindingNamespace;

		try {
			if (process.env.NODE_ENV !== 'production') {
				this.renderWarnings = new RenderWarnings(host);
			}
		} catch {}
	}

	/**
	 * Runs all connection callbacks registered by decorators or host adapters.
	 */
	public connectHost(): void {
		this.observeMembers();

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

		this.unobserveMembers();
	}

	/**
	 * Starts reporting member changes to the host update cycle.
	 *
	 * @remarks
	 * Members that changed while unobserved are reported first, so writes made
	 * before connect or while detached still reach `@onUpdated`. Observation is
	 * scoped to connection (and SSR preparation) so a shared `@signal` source
	 * never holds a detached or server-only host.
	 *
	 * @returns Stops the observation this call started; a no-op when members were already observed.
	 */
	public observeMembers(): () => void {
		if (this.observing) {
			return () => {};
		}

		this.observing = true;

		for (const [propertyName, signal] of this.reactiveMembers) {
			this.observeMember(propertyName, signal);
		}

		return () => this.unobserveMembers();
	}

	/** Stops reporting member changes and snapshots each value for the next {@link observeMembers}. */
	public unobserveMembers(): void {
		if (!this.observing) {
			return;
		}

		this.observing = false;

		for (const [propertyName, unsubscribe] of this.changeSubscriptions) {
			unsubscribe();
			this.memberSnapshots.set(propertyName, this.reactiveMembers.get(propertyName)?.get());
		}

		this.changeSubscriptions.clear();
	}

	/**
	 * Registers a callback that should run on host disconnect.
	 */
	public registerCleanupCallback(callback: () => void): void {
		this.onDisconnectedCallback.push(callback);
	}

	/**
	 * Registers work that runs synchronously when the host starts connecting.
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
	public registerPostSync(callback: () => void): void {
		this.postSyncCallbacks.push(callback);
	}

	/**
	 * Registers work for the client connect pass after post-sync callbacks.
	 *
	 * @remarks Callbacks remain registered across disconnects. The Element Host's client connect path owns flushing them; SSR preparation and serialization do not.
	 */
	public registerConnectSync(callback: () => void): void {
		this.connectSyncCallbacks.push(callback);
	}

	/**
	 * Runs every post-sync callback registered on this host.
	 */
	public flushPostSync(): void {
		for (const callback of this.postSyncCallbacks) {
			callback();
		}
	}

	public flushConnectSync(): void {
		for (const callback of this.connectSyncCallbacks) {
			callback();
		}
	}

	/**
	 * Emits an initial update for a member without a value change.
	 *
	 * @remarks Runs the synchronous callbacks (`@bindTo`) now and queues the
	 * member for the next batched cycle. Used for the first-connect emit of
	 * `@prop` members. Value changes flow through the member `State`'s own
	 * subscription instead.
	 */
	public notifyUpdate(changedProperty: string, _oldValue: unknown, _value: unknown): void {
		const callbacks = this.updateCallbacks.get(changedProperty);

		if (callbacks) {
			for (const update of [...callbacks.keys()]) {
				update();
			}
		}

		this.onMemberChanged(changedProperty);
	}

	/**
	 * Registers a batched callback that runs once per changed batch when any of
	 * `keys` changed, receiving every member changed in that cycle.
	 */
	public registerUpdatedCallback(keys: readonly string[], callback: UpdatedCallback): () => void {
		const registration: UpdatedRegistration = { keys: new Set(keys), callback };
		this.updatedCallbacks.push(registration);

		return () => {
			this.updatedCallbacks = this.updatedCallbacks.filter((entry) => entry !== registration);
		};
	}

	/** Runs every batched callback whose keys intersect `changed`, in registration order. */
	public runUpdatedCallbacks(changed: ReadonlySet<string>): void {
		for (const { keys, callback } of [...this.updatedCallbacks]) {
			for (const key of keys) {
				if (changed.has(key)) {
					callback(changed);
					break;
				}
			}
		}
	}

	/**
	 * Returns the member registered under `propertyName`, typed read-only, if any.
	 *
	 * @remarks The read-only type is the whole contract: this is the registered object itself, not
	 * a wrapper, so member identity stays stable for bindings and callbacks. Write through the
	 * host field, not the member.
	 */
	public getReactiveMember<T = unknown>(propertyName: string): ReadonlyReactiveState<T> | undefined {
		return this.reactiveMembers.get(propertyName) as ReadonlyReactiveState<T> | undefined;
	}

	public markFieldAccessor(propertyName: string): void {
		this.accessorNames.add(propertyName);
	}

	public getWritableMember<T = unknown>(propertyName: string): ReactiveState<T> | undefined {
		const member = this.reactiveMembers.get(propertyName);

		if (member && typeof (member as Partial<ReactiveState<unknown>>).set !== 'function') {
			throw new Error(
				`[@ecopages/radiant] "${propertyName}" is already registered as a read-only member and cannot be redeclared as a writable field.`,
			);
		}

		return member as ReactiveState<T> | undefined;
	}

	/**
	 * Creates a new reactive member state and registers it under `propertyName`.
	 */
	public createReactiveMember<T>(propertyName: string, initialValue: T): ReactiveState<T> {
		const signal = state(initialValue);
		this.registerMember(propertyName, signal as ReadonlyReactiveState<unknown>);
		return signal;
	}

	/**
	 * Registers an externally-owned reactive member state (used by the
	 * `signal()` decorator, whose state is a user-provided signals `Signal`).
	 * A read-only `{ get, subscribe }` object is enough.
	 *
	 * @throws When a read-only member would replace the member behind a field accessor: the
	 * accessor and `@bindTo` would keep the old state while `this.$` followed the new one.
	 *
	 * @remarks Replacing a writable member with another writable one is unchanged and not guarded.
	 */
	public registerReactiveMember<T>(propertyName: string, signal: ReadonlyReactiveState<T>): void {
		if (this.accessorNames.has(propertyName) && typeof (signal as Partial<ReactiveState<T>>).set !== 'function') {
			throw new Error(
				`[@ecopages/radiant] "${propertyName}" is a writable field and cannot be replaced by a read-only member; register a writable state or use another name.`,
			);
		}

		this.registerMember(propertyName, signal as ReadonlyReactiveState<unknown>);
	}

	/**
	 * Stores the member state, reports its changes to the host update cycle, and
	 * subscribes synchronous callbacks registered before the member existed
	 * (decorator initializer ordering).
	 */
	private registerMember(propertyName: string, signal: ReadonlyReactiveState<unknown>): void {
		this.reactiveMembers.set(propertyName, signal);
		this.jsxBindings.delete(propertyName);
		this.changeSubscriptions.get(propertyName)?.();
		this.changeSubscriptions.delete(propertyName);

		if (this.observing) {
			this.observeMember(propertyName, signal);
		} else {
			this.memberSnapshots.set(propertyName, signal.get());
		}

		const callbacks = this.updateCallbacks.get(propertyName);

		if (callbacks) {
			for (const update of callbacks.keys()) {
				this.subscribeCallback(propertyName, update);
			}
		}
	}

	private observeMember(propertyName: string, signal: ReadonlyReactiveState<unknown>): void {
		if (
			this.memberSnapshots.has(propertyName) &&
			!Object.is(this.memberSnapshots.get(propertyName), signal.get())
		) {
			this.memberChanged(propertyName);
		}

		this.memberSnapshots.delete(propertyName);
		this.changeSubscriptions.set(
			propertyName,
			signal.subscribe(() => this.memberChanged(propertyName)),
		);
	}

	private memberChanged(propertyName: string): void {
		this.renderWarnings?.noteChange(propertyName);
		this.onMemberChanged(propertyName);
	}

	/**
	 * Subscribes a synchronous callback to the member state if the member is
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
			unsubscribe: signal.subscribe(() => {
				if (!this.initializingReactiveFields.has(propertyName)) {
					update();
				}
			}),
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

		const source = signal as ReadonlyReactiveState<ReactiveBindingValue<Bindings, Property>>;
		const binding = adaptReactiveStateToJsxBinding(this.renderWarnings?.observeBinding(key, source) ?? source);

		this.jsxBindings.set(key, binding);
		return binding;
	}

	/**
	 * Registers a synchronous callback for a named reactive member.
	 *
	 * @remarks Runs on every write of the member, before the batched cycle. Used
	 * by `@bindTo`, whose DOM writes must land with the value like `$` bindings.
	 * Use {@link registerUpdatedCallback} for procedures.
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
	 * Defines a reactive getter/setter pair on the host backed by a member
	 * `State`.
	 */
	public defineReactiveAccessor<T>(propertyName: string, options: ReactiveAccessorDefinition<T>): void {
		this.markFieldAccessor(propertyName);
		const read = () => options.signal.get();

		this.access.defineProperty(this.host, propertyName, {
			get: this.renderWarnings ? this.renderWarnings.trackReads(propertyName, read) : read,
			set: (newValue: T) => {
				const next = options.fromProperty ? options.fromProperty(newValue) : newValue;
				options.signal.set(next);
				options.onSet?.(next);
			},
			enumerable: true,
			configurable: true,
		});
	}

	/**
	 * Defines a controller- or element-local reactive field.
	 *
	 * @remarks A member bootstrapped earlier (legacy decorators register it before
	 * class fields run) adopts `initialValue` as initialization: while members are
	 * unobserved, the adoption is not reported to the update cycle or synchronous
	 * callbacks such as `@bindTo`.
	 */
	public createReactiveField<T>(propertyName: string, initialValue: T, options: ReactiveFieldOptions = {}): void {
		const existing = this.getWritableMember<T>(propertyName);
		const signal = existing ?? this.createReactiveMember(propertyName, initialValue);

		if (existing && initialValue !== undefined) {
			const wasInitializing = this.initializingReactiveFields.has(propertyName);
			this.initializingReactiveFields.add(propertyName);

			try {
				signal.set(initialValue);
			} finally {
				if (!wasInitializing) {
					this.initializingReactiveFields.delete(propertyName);
				}
			}

			if (!this.observing) {
				this.memberSnapshots.set(propertyName, signal.get());
			}
		}

		this.defineReactiveAccessor(propertyName, { signal });

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

type ReactiveHostAccess = {
	defineProperty(target: object, property: string, descriptor: PropertyDescriptor): void;
};
