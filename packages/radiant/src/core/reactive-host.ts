import { HAS_PRE_UPGRADE_VALUE } from './pre-upgrade-value';
import type { JsxBindingSourceValue, SubscribableJsxValueWithAccess } from '@ecopages/jsx';
import { HostSsrRegistry } from './host-ssr-registry';
import { adaptReactiveStateToJsxBinding } from './reactive-binding-adapter';
import { state } from '@ecopages/signals';
import { RenderWarnings } from './render-warnings';
import { isWritableState, type ReactiveState, type ReadonlyReactiveState } from './reactivity-contract';
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
	/**
	 * Defines a getter for a registered read-only member. Assignment throws.
	 *
	 * @remarks The getter reads the current member, so `registerReactiveMember` can
	 * replace it (a store from context). It does not mark a field accessor: a marked
	 * name cannot be replaced by a read-only member.
	 */
	defineReadonlyReactiveAccessor(propertyName: string): void;
	/**
	 * Whether the host has connected and run its post-sync pass, so its attributes have caught up.
	 *
	 * @remarks An element that upgrades in place is already `isConnected` inside its constructor, before this is
	 * true, so work that needs the settled host checks this instead of `isConnected`.
	 */
	readonly connectSettled: boolean;
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
	/**
	 * Development diagnostics for whole-render reads; absent in a production build.
	 *
	 * @remarks Each hook that uses it repeats the `process.env.NODE_ENV` guard inside its own `try` on purpose: a
	 * shared helper is not reliably dropped from a production bundle, and the dist test checks the literal guard.
	 */
	private readonly renderWarnings?: RenderWarnings;

	private reactiveMembers = new Map<string, ReadonlyReactiveState<unknown>>();
	/** Names with a field accessor, which closes over the member it was defined with. */
	private accessorNames = new Set<string>();
	private jsxBindings = new Map<string, SubscribableJsxValueWithAccess<JsxBindingSourceValue>>();
	/**
	 * Synchronous per-member callbacks keyed by property; values track the subscribed signal so replacements can
	 * resubscribe. A value is set only while members are observed.
	 */
	private updateCallbacks = new Map<string, Map<() => void, UpdateSubscription | undefined>>();
	private updatedCallbacks: UpdatedRegistration[] = [];
	/** Change reports to the update cycle; held only while members are observed. */
	private changeSubscriptions = new Map<string, () => void>();
	/** Member values captured while unobserved, diffed when observation resumes. */
	private memberSnapshots = new Map<string, unknown>();
	private initializingReactiveFields = new Set<string>();
	private observing = false;
	/** Bumped each time observation starts or stops, so a pass can tell the host changed state under it. */
	private observationEpoch = 0;
	/** Whether the host is connected on the client; server lifecycles observe members without it. */
	private clientConnected = false;
	private settled = false;
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
	 *
	 * @remarks Stops as soon as observation changed under the pass: a callback that
	 * disconnects the host has already run the cleanup callbacks, so a later
	 * connection callback would acquire resources nothing releases, and one that
	 * also reconnects it has already run the whole pass.
	 *
	 * @param client - `false` for a server lifecycle (a Controller Host's server render): members are
	 * observed, but read-only members are not subscribed ({@link subscribable}).
	 *
	 * @returns Whether observation is still the one this pass started. When it is not, the host
	 * disconnected under the pass, or a nested connect already ran the rest of the connect work, so
	 * the caller must not flush. A host that was already observing keeps its observation, so the pass
	 * is still its own.
	 */
	public connectHost(client = true): boolean {
		this.clientConnected = client;
		this.settled = false;
		const epoch = this.startObservation();

		for (const callback of this.onConnectedCallbacks) {
			if (epoch !== this.observationEpoch) {
				break;
			}

			callback();
		}

		return epoch === this.observationEpoch;
	}

	/**
	 * Runs all cleanup callbacks registered for host disconnect.
	 */
	public disconnectHost(): void {
		this.clientConnected = false;
		this.settled = false;

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
	 * before connect or while detached still reach `@onUpdated` and the
	 * synchronous update callbacks (`@bindTo`). Observation is scoped to
	 * connection (and SSR preparation) so a shared `@signal` source never holds
	 * a detached or server-only host; update callbacks subscribe and release
	 * with it.
	 *
	 * @returns Stops the observation this call started; a no-op when members were already observed, and once
	 * that observation has ended, so it cannot end a later one.
	 */
	public observeMembers(): () => void {
		const wasObserving = this.observing;
		const epoch = this.startObservation();

		return () => {
			if (!wasObserving && epoch === this.observationEpoch) {
				this.unobserveMembers();
			}
		};
	}

	/** Returns the epoch of the observation in force; a pass compares it to detect a disconnect underneath it. */
	private startObservation(): number {
		if (this.observing) {
			return this.observationEpoch;
		}

		this.observing = true;
		const epoch = ++this.observationEpoch;

		for (const [propertyName, callbacks] of this.updateCallbacks) {
			for (const update of callbacks.keys()) {
				this.subscribeCallback(propertyName, update);
			}
		}

		for (const [propertyName, signal] of this.reactiveMembers) {
			if (epoch !== this.observationEpoch) {
				break;
			}

			this.observeMember(propertyName, signal);
		}

		return epoch;
	}

	/** Stops reporting member changes, releases the update-callback subscriptions and snapshots each value for the next {@link observeMembers}. */
	public unobserveMembers(): void {
		if (!this.observing) {
			return;
		}

		this.observing = false;
		this.observationEpoch++;

		for (const [propertyName, unsubscribe] of this.changeSubscriptions) {
			unsubscribe();
			this.memberSnapshots.set(propertyName, this.reactiveMembers.get(propertyName)?.get());
		}

		this.changeSubscriptions.clear();

		for (const callbacks of this.updateCallbacks.values()) {
			for (const [update, subscription] of callbacks) {
				subscription?.unsubscribe();
				callbacks.set(update, undefined);
			}
		}
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
		this.settled = true;
	}

	public get connectSettled(): boolean {
		return this.settled;
	}

	public flushConnectSync(): void {
		for (const callback of this.connectSyncCallbacks) {
			callback();
		}
	}

	/**
	 * Emits an initial update for a member without a value change.
	 *
	 * @remarks Runs the synchronous callbacks (`@bindTo`) now, only while members
	 * are observed, and queues the member for the next batched cycle. Used for the
	 * first-connect emit of `@prop` members. While unobserved the callbacks are skipped:
	 * the connect diff runs them when the value differs from its snapshot, and the
	 * post-sync pass paints `@bindTo`. Value changes flow through the member `State`'s
	 * own subscription instead.
	 */
	public notifyUpdate(changedProperty: string, _oldValue: unknown, _value: unknown): void {
		if (this.observing) {
			this.runUpdateCallbacks(changedProperty);
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

		if (member && !isWritableState(member)) {
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
		if (this.accessorNames.has(propertyName) && !isWritableState(signal)) {
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
	 *
	 * @remarks
	 * Once the host has been observed, a member replaced while detached keeps the snapshot taken at disconnect, so the
	 * next connect reports it when the value differs. Before the first connect the replacement is the member's initial
	 * value: legacy decorators bootstrap members at construction and register them again at first connect, which is not
	 * a change.
	 */
	private registerMember(propertyName: string, signal: ReadonlyReactiveState<unknown>): void {
		this.reactiveMembers.set(propertyName, signal);
		this.jsxBindings.delete(propertyName);

		if (this.observing) {
			this.observeMember(propertyName, signal);
		} else if (this.observationEpoch === 0 || !this.memberSnapshots.has(propertyName)) {
			this.memberSnapshots.set(propertyName, signal.get());
		}

		const callbacks = this.updateCallbacks.get(propertyName);

		if (callbacks) {
			for (const update of callbacks.keys()) {
				this.subscribeCallback(propertyName, update);
			}
		}
	}

	/**
	 * @remarks Subscribes before reporting a diff so a callback that disconnects
	 * the host finds this member in the observation it releases, and snapshots it
	 * for the next connect. Releases a subscription already held for the member,
	 * which a callback registering it mid-pass would otherwise orphan.
	 */
	private observeMember(propertyName: string, signal: ReadonlyReactiveState<unknown>): void {
		const changed =
			this.memberSnapshots.has(propertyName) && !Object.is(this.memberSnapshots.get(propertyName), signal.get());

		this.memberSnapshots.delete(propertyName);
		this.changeSubscriptions.get(propertyName)?.();
		this.changeSubscriptions.set(
			propertyName,
			this.subscribable(signal).subscribe(() => this.memberChanged(propertyName)),
		);

		if (changed) {
			this.memberChanged(propertyName);
			this.runUpdateCallbacks(propertyName);
		}
	}

	/**
	 * @remarks Runs a copy of the registrations, so one that registers another does not run it in this pass. A
	 * callback unregistered by an earlier one is skipped, and the pass stops once observation changed under it.
	 */
	private runUpdateCallbacks(propertyName: string): void {
		const epoch = this.observationEpoch;

		for (const update of [...(this.updateCallbacks.get(propertyName)?.keys() ?? [])]) {
			if (epoch !== this.observationEpoch) {
				break;
			}

			if (this.updateCallbacks.get(propertyName)?.has(update)) {
				update();
			}
		}
	}

	private memberChanged(propertyName: string): void {
		try {
			if (process.env.NODE_ENV !== 'production') this.renderWarnings?.noteChange(propertyName);
		} catch {}

		this.onMemberChanged(propertyName);
	}

	/**
	 * Subscribes a synchronous callback to the member state if the member is
	 * already registered and members are observed.
	 *
	 * Re-subscribes only when the member signal identity changes (for example
	 * `registerReactiveMember` replacing a previous state). Same-signal calls
	 * keep the existing subscription.
	 */
	private subscribeCallback(propertyName: string, update: () => void): void {
		const callbacks = this.updateCallbacks.get(propertyName);
		const signal = this.reactiveMembers.get(propertyName);

		if (!callbacks || !signal || !this.observing) {
			return;
		}

		const current = callbacks.get(update);

		if (current?.signal === signal) {
			return;
		}

		current?.unsubscribe();
		callbacks.set(update, {
			signal,
			unsubscribe: this.subscribable(signal).subscribe(() => {
				if (!this.initializingReactiveFields.has(propertyName) && !this.memberSnapshots.has(propertyName)) {
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

		const source = this.subscribable(signal) as ReadonlyReactiveState<ReactiveBindingValue<Bindings, Property>>;
		let observed: Pick<
			ReadonlyReactiveState<ReactiveBindingValue<Bindings, Property>>,
			'get' | 'subscribe'
		> = source;

		try {
			if (process.env.NODE_ENV !== 'production' && this.renderWarnings) {
				observed = this.renderWarnings.observeBinding(key, source);
			}
		} catch {}

		const binding = adaptReactiveStateToJsxBinding(observed);

		this.jsxBindings.set(key, binding);
		return binding;
	}

	/**
	 * Registers a synchronous callback for a named reactive member.
	 *
	 * @remarks Runs on every write of the member, before the batched cycle, while
	 * members are observed (host connected, or SSR preparation). The subscription is
	 * released on disconnect and re-established on connect; writes made before
	 * connect or while detached do not run it, but it runs once on connect when the
	 * member's value differs from its last observed value. During that diff a write
	 * to a member already visited runs its callbacks like any write, and a write to
	 * one not yet visited is covered by that member's own diff. Used by `@bindTo`,
	 * whose DOM writes must land with the value like `$` bindings. Use
	 * {@link registerUpdatedCallback} for procedures.
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
		let get = () => options.signal.get();

		try {
			if (process.env.NODE_ENV !== 'production' && this.renderWarnings) {
				get = this.renderWarnings.trackReads(propertyName, get);
			}
		} catch {}

		this.access.defineProperty(this.host, propertyName, {
			get,
			set: (newValue: T) => {
				const next = options.fromProperty ? options.fromProperty(newValue) : newValue;
				options.signal.set(next);
				options.onSet?.(next);
			},
			enumerable: true,
			configurable: true,
		});
	}

	public defineReadonlyReactiveAccessor(propertyName: string): void {
		let get = () => {
			const member = this.getReactiveMember(propertyName);

			if (!member) {
				throw new Error(`[@ecopages/radiant] "${propertyName}" is not registered as a reactive member.`);
			}

			return member.get();
		};

		try {
			if (process.env.NODE_ENV !== 'production' && this.renderWarnings) {
				get = this.renderWarnings.trackReads(propertyName, get);
			}
		} catch {}

		this.access.defineProperty(this.host, propertyName, {
			get,
			set: () => {
				throw new TypeError(
					`[@ecopages/radiant] "${propertyName}" is a read-only member and cannot be assigned.`,
				);
			},
			enumerable: true,
			configurable: true,
		});
	}

	/**
	 * Returns the member under `propertyName`, creating it when absent.
	 *
	 * @remarks A member bootstrapped earlier (legacy decorators register it before class fields run) is adopted
	 * rather than replaced, so bindings taken from it keep following the field, and `initialValue` becomes its
	 * initialization: while members are unobserved, the adoption is not reported to the update cycle or synchronous
	 * callbacks such as `@bindTo`. An `undefined` `initialValue` leaves an adopted member as it is.
	 */
	public adoptReactiveMember<T>(propertyName: string, initialValue: T): ReactiveState<T> {
		const existing = this.getWritableMember<T>(propertyName);

		if (!existing) {
			return this.createReactiveMember(propertyName, initialValue);
		}

		if (initialValue !== undefined) {
			const wasInitializing = this.initializingReactiveFields.has(propertyName);
			this.initializingReactiveFields.add(propertyName);

			try {
				existing.set(initialValue);
			} finally {
				if (!wasInitializing) {
					this.initializingReactiveFields.delete(propertyName);
				}
			}

			if (!this.observing) {
				this.memberSnapshots.set(propertyName, existing.get());
			}
		}

		return existing;
	}

	/**
	 * Defines a controller- or element-local reactive field, adopting a member bootstrapped earlier as
	 * {@link adoptReactiveMember} does.
	 */
	public createReactiveField<T>(propertyName: string, initialValue: T, options: ReactiveFieldOptions = {}): void {
		const signal = this.adoptReactiveMember(propertyName, initialValue);

		this.defineReactiveAccessor(propertyName, { signal });

		if (!options.suppressInitialNotify) {
			this.notifyUpdate(propertyName, undefined, signal.get());
		}
	}

	/**
	 * Returns what the host subscribes to for `member`: the member itself when writable, else a view of it that
	 * subscribes only while the host is connected on the client.
	 *
	 * @remarks A read-only member is owned outside the host, such as `fromExternalStore(...)`, so a server lifecycle
	 * (SSR preparation, a Controller Host's server render) must not subscribe to it: that would subscribe to the store
	 * on the server and replace its server snapshot. On the client, disconnect releases what the host subscribed:
	 * change reports and `@bindTo` with {@link unobserveMembers}, and the view's bindings with `pauseSubscriptions`.
	 */
	private subscribable(member: ReadonlyReactiveState<unknown>): ReadonlyReactiveState<unknown> {
		if (isWritableState(member)) {
			return member;
		}

		return {
			get: () => member.get(),
			subscribe: (notify) => (this.clientConnected ? member.subscribe(notify) : () => {}),
		};
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
