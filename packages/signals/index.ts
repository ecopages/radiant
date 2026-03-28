/** Callback invoked when a signal's current value changes. */
export type SignalSubscriber<Value> = (value: Value) => void;

const COMPUTED_NO_ERROR = Symbol.for('@ecopages/signals.computed-no-error');

/** Hook invoked when a signal becomes watched through `subtle.Watcher`. */
export const watched = Symbol.for('@ecopages/signals.subtle.watched');

/** Hook invoked when a signal stops being watched through `subtle.Watcher`. */
export const unwatched = Symbol.for('@ecopages/signals.subtle.unwatched');

type SignalEquals<Value> = (this: Signal<Value>, previousValue: Value, nextValue: Value) => boolean;
type ComputedCallback<Value> = (this: Computed<Value>) => Value;

/** Optional configuration shared by writable and computed signals. */
export interface SignalOptions<Value> {
	/**
	 * Equality comparison used to suppress redundant updates.
	 *
	 * Defaults to `Object.is`.
	 */
	equals?: SignalEquals<Value>;

	/** Called when the signal becomes watched through `subtle.Watcher`. */
	[watched]?: (this: Signal<Value>) => void;

	/** Called when the signal is no longer watched through `subtle.Watcher`. */
	[unwatched]?: (this: Signal<Value>) => void;
}

/** Read-only signal contract. */
export interface Signal<Value> {
	/** Returns the signal's current value. */
	get(): Value;

	/**
	 * Subscribes to value changes.
	 *
	 * Subscribers are only called when the signal's exposed value changes under
	 * its configured equality function.
	 */
	subscribe(notify: SignalSubscriber<Value>): () => void;
}

/** Read-write signal contract. */
export interface WritableSignal<Value> extends Signal<Value> {
	/** Replaces the current value. */
	set(nextValue: Value): void;

	/** Replaces the current value using the previous one. */
	update(updater: (value: Value) => Value): void;
}

/** Scheduler used to defer effect re-execution. */
export type EffectScheduler = (run: () => void) => void;

/** Cleanup function returned from an effect body. */
export type EffectCleanup = void | (() => void);

/** Callback executed by an effect. */
export type EffectCallback = () => EffectCleanup;

/** Configuration for an effect. */
export interface EffectOptions {
	/**
	 * Scheduler used after a dependency changes.
	 *
	 * Defaults to a microtask queue.
	 */
	scheduler?: EffectScheduler;
}

/** Configuration for value watchers. */
export interface WatchOptions<Value> extends SignalOptions<Value> {
	/**
	 * When `true`, invokes the callback during the initial run with an undefined
	 * previous value.
	 */
	immediate?: boolean;

	/** Scheduler used after the watched value changes. */
	scheduler?: EffectScheduler;
}

/** Marker interface returned from `createStore(...)`. */
export type SignalStore<Value extends object> = Value;

const defaultEquals: SignalEquals<unknown> = function (previousValue, nextValue) {
	return Object.is(previousValue, nextValue);
};

type DependencyNode = SignalNode<any>;
type WatchableSignal = SignalNode<unknown>;

let activeDependencyRecorder: ((dependency: DependencyNode) => void) | undefined;
let activeComputedSignal: Computed<any> | undefined;
let frozenWatcherDepth = 0;

const STORE_BRANCH_SYMBOL = Symbol.for('@ecopages/signals.store-branch');
const STORE_ABSENT = Symbol.for('@ecopages/signals.store-absent');
const storeNodeLookup = new WeakMap<object, StoreNode<object>>();

type StoreBranch = {
	readonly [STORE_BRANCH_SYMBOL]: true;
	readonly node: StoreNode<any>;
};

type StoreEntryValue = StoreBranch | typeof STORE_ABSENT | unknown;

type StoreNode<Value extends object> = {
	entries: Map<PropertyKey, State<StoreEntryValue>>;
	proxy: Value;
	shape: State<number>;
	target: Value;
	valueType: 'array' | 'object';
};

const hasOwnProperty = Object.prototype.hasOwnProperty;
const scheduleMicrotask: EffectScheduler = (run) => {
	queueMicrotask(run);
};

function assertSignalAccessAllowed(): void {
	if (frozenWatcherDepth > 0) {
		throw new Error('Cannot read or write signals during a Watcher notification.');
	}
}

function currentComputedSignal(): Computed<unknown> | null {
	return activeComputedSignal ?? null;
}

abstract class SignalNode<Value> implements Signal<Value> {
	protected readonly subscribers = new Set<SignalSubscriber<Value>>();
	protected version = 0;
	private readonly watcherListeners = new Set<() => void>();
	private readonly onWatched: ((this: Signal<Value>) => void) | undefined;
	private readonly onUnwatched: ((this: Signal<Value>) => void) | undefined;

	protected constructor(options: SignalOptions<Value> = {}) {
		this.onWatched = options[watched];
		this.onUnwatched = options[unwatched];
	}

	abstract get(): Value;
	abstract subscribe(notify: SignalSubscriber<Value>): () => void;

	public addWatcher(notify: () => void): () => void {
		const wasEmpty = this.watcherListeners.size === 0;
		this.watcherListeners.add(notify);

		if (wasEmpty) {
			try {
				this.handleFirstWatcherAdded();
				this.onWatched?.call(this);
			} catch (error) {
				this.watcherListeners.delete(notify);
				throw error;
			}
		}

		return () => {
			if (!this.watcherListeners.delete(notify)) {
				return;
			}

			if (this.watcherListeners.size === 0) {
				this.handleLastWatcherRemoved();
				this.onUnwatched?.call(this);
			}
		};
	}

	public getVersion(): number {
		return this.version;
	}

	public getWatcherCount(): number {
		return this.watcherListeners.size;
	}

	protected connectToActiveComputed(): void {
		activeDependencyRecorder?.(this);
	}

	protected handleFirstWatcherAdded(): void {}

	protected handleLastWatcherRemoved(): void {}

	protected publish(nextValue: Value): void {
		for (const subscriber of this.subscribers) {
			subscriber(nextValue);
		}
	}

	protected notifyWatchers(): void {
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
			throw new AggregateError(errors, 'Multiple watcher notifications failed.');
		}
	}
}

/**
 * Writable state signal.
 *
 * State signals are the smallest unit of mutable reactive data in this package.
 */
export class State<Value> extends SignalNode<Value> implements WritableSignal<Value> {
	private readonly equals: SignalEquals<Value>;
	private value: Value;

	constructor(initialValue: Value, options: SignalOptions<Value> = {}) {
		super(options);
		this.value = initialValue;
		this.equals = (options.equals ?? defaultEquals) as SignalEquals<Value>;
	}

	public get(): Value {
		assertSignalAccessAllowed();
		this.connectToActiveComputed();
		return this.value;
	}

	public set(nextValue: Value): void {
		assertSignalAccessAllowed();

		if (this.equals.call(this, this.value, nextValue)) {
			return;
		}

		this.value = nextValue;
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

	public update(updater: (value: Value) => Value): void {
		this.set(updater(this.value));
	}

	public subscribe(notify: SignalSubscriber<Value>): () => void {
		this.subscribers.add(notify);

		return () => {
			this.subscribers.delete(notify);
		};
	}
}

/**
 * Lazily derived signal backed by other signals read during evaluation.
 *
 * Dependencies are discovered automatically each time the computation runs.
 */
export class Computed<Value> extends SignalNode<Value> {
	private readonly compute: ComputedCallback<Value>;
	private readonly dependencyUnsubscribers = new Map<SignalNode<unknown>, () => void>();
	private readonly dependencyWatcherUnsubscribers = new Map<SignalNode<unknown>, () => void>();
	private readonly equals: SignalEquals<Value>;
	private dependencies = new Map<DependencyNode, number>();
	private computing = false;
	private error: unknown = undefined;
	private hasError = false;
	private initialized = false;
	private pendingDependencies = new Map<DependencyNode, number>();
	private stale = true;
	private value!: Value;

	constructor(compute: ComputedCallback<Value>, options: SignalOptions<Value> = {}) {
		super(options);
		this.compute = compute;
		this.equals = (options.equals ?? defaultEquals) as SignalEquals<Value>;
	}

	public get(): Value {
		assertSignalAccessAllowed();
		this.refreshIfNeeded();
		this.connectToActiveComputed();

		if (this.hasError) {
			throw this.error;
		}

		return this.value;
	}

	public subscribe(notify: SignalSubscriber<Value>): () => void {
		const wasEmpty = this.subscribers.size === 0;
		this.subscribers.add(notify);

		if (wasEmpty) {
			try {
				this.refreshIfNeeded();
				this.syncDependencySubscriptions();
			} catch (error) {
				this.subscribers.delete(notify);
				throw error;
			}
		}

		return () => {
			this.subscribers.delete(notify);

			if (this.subscribers.size === 0) {
				this.clearDependencySubscriptions();
			}
		};
	}

	private clearDependencySubscriptions(): void {
		for (const unsubscribe of this.dependencyUnsubscribers.values()) {
			unsubscribe();
		}

		this.dependencyUnsubscribers.clear();
	}

	private clearDependencyWatcherSubscriptions(): void {
		for (const unsubscribe of this.dependencyWatcherUnsubscribers.values()) {
			unsubscribe();
		}

		this.dependencyWatcherUnsubscribers.clear();
	}

	private handleDependencyChange = () => {
		this.stale = true;

		if (this.subscribers.size === 0) {
			return;
		}

		const previousVersion = this.version;
		this.refreshIfNeeded();

		if (this.version !== previousVersion && !this.hasError) {
			this.publish(this.value);
		}
	};

	private handleDependencyWatcherChange = () => {
		this.stale = true;
		this.notifyWatchers();
	};

	private haveDependenciesChanged(): boolean {
		for (const [dependency, version] of this.dependencies) {
			dependency.get();

			if (dependency.getVersion() !== version) {
				return true;
			}
		}

		return false;
	}

	private recompute(): void {
		if (this.computing) {
			throw new Error('Cannot read a computed signal recursively.');
		}

		const previousActiveDependencyRecorder = activeDependencyRecorder;
		const previousActiveComputedSignal = activeComputedSignal;
		const previousValue = this.value;
		const previousError = this.error;
		const wasInitialized = this.initialized;
		let nextValue!: Value;
		let nextDependencies = new Map<DependencyNode, number>();
		let nextError: typeof COMPUTED_NO_ERROR | unknown = COMPUTED_NO_ERROR;

		this.computing = true;
		this.pendingDependencies = new Map();

		try {
			activeComputedSignal = this;
			activeDependencyRecorder = (dependency) => {
				this.trackDependency(dependency);
			};
			nextValue = this.compute.call(this);
		} catch (error) {
			nextError = error;
		} finally {
			nextDependencies = this.pendingDependencies;
			activeComputedSignal = previousActiveComputedSignal;
			activeDependencyRecorder = previousActiveDependencyRecorder;
			this.pendingDependencies = new Map();
			this.computing = false;
		}

		this.dependencies = nextDependencies;
		this.stale = false;
		const hasChanged =
			!wasInitialized ||
			(nextError === COMPUTED_NO_ERROR
				? this.hasError || !this.equals.call(this, previousValue, nextValue)
				: !this.hasError || previousError !== nextError);

		if (nextError === COMPUTED_NO_ERROR) {
			this.value = nextValue;
			this.error = undefined;
			this.hasError = false;
		} else {
			this.error = nextError;
			this.hasError = true;
		}

		this.initialized = true;

		if (hasChanged) {
			this.version += 1;
		}

		if (this.subscribers.size > 0) {
			this.syncDependencySubscriptions();
		}

		if (this.getWatcherCount() > 0) {
			this.syncDependencyWatcherSubscriptions();
		}
	}

	private refreshIfNeeded(): void {
		if (!this.initialized || this.stale || this.haveDependenciesChanged()) {
			this.recompute();
		}
	}

	private syncDependencySubscriptions(): void {
		for (const [dependency, unsubscribe] of this.dependencyUnsubscribers) {
			if (this.dependencies.has(dependency)) {
				continue;
			}

			unsubscribe();
			this.dependencyUnsubscribers.delete(dependency);
		}

		for (const dependency of this.dependencies.keys()) {
			if (this.dependencyUnsubscribers.has(dependency)) {
				continue;
			}

			this.dependencyUnsubscribers.set(dependency, dependency.subscribe(this.handleDependencyChange));
		}
	}

	private syncDependencyWatcherSubscriptions(): void {
		for (const [dependency, unsubscribe] of this.dependencyWatcherUnsubscribers) {
			if (this.dependencies.has(dependency)) {
				continue;
			}

			unsubscribe();
			this.dependencyWatcherUnsubscribers.delete(dependency);
		}

		for (const dependency of this.dependencies.keys()) {
			if (this.dependencyWatcherUnsubscribers.has(dependency)) {
				continue;
			}

			this.dependencyWatcherUnsubscribers.set(
				dependency,
				dependency.addWatcher(this.handleDependencyWatcherChange),
			);
		}
	}

	private trackDependency(dependency: DependencyNode): void {
		this.pendingDependencies.set(dependency, dependency.getVersion());
	}

	protected override handleFirstWatcherAdded(): void {
		this.refreshIfNeeded();
		this.syncDependencyWatcherSubscriptions();
	}

	protected override handleLastWatcherRemoved(): void {
		this.clearDependencyWatcherSubscriptions();
	}
}

class EffectRunner {
	private cleanup: (() => void) | undefined;
	private readonly dependencies = new Map<DependencyNode, () => void>();
	private disposed = false;
	private queued = false;
	private readonly scheduler: EffectScheduler;

	constructor(
		private readonly callback: EffectCallback,
		options: EffectOptions,
	) {
		this.scheduler = options.scheduler ?? scheduleMicrotask;
	}

	public dispose(): void {
		if (this.disposed) {
			return;
		}

		this.disposed = true;
		this.cleanup?.();
		this.cleanup = undefined;

		for (const unsubscribe of this.dependencies.values()) {
			unsubscribe();
		}

		this.dependencies.clear();
	}

	public run = (): void => {
		if (this.disposed) {
			return;
		}

		this.queued = false;
		this.cleanup?.();
		this.cleanup = undefined;

		const nextDependencies = new Set<DependencyNode>();
		const previousActiveDependencyRecorder = activeDependencyRecorder;

		try {
			activeDependencyRecorder = (dependency) => {
				nextDependencies.add(dependency);
			};
			const result = this.callback();

			if (typeof result === 'function') {
				this.cleanup = result;
			}
		} finally {
			activeDependencyRecorder = previousActiveDependencyRecorder;
		}

		this.syncDependencies(nextDependencies);
	};

	private handleDependencyChange = () => {
		if (this.disposed || this.queued) {
			return;
		}

		this.queued = true;
		this.scheduler(this.run);
	};

	private syncDependencies(nextDependencies: Set<DependencyNode>): void {
		for (const [dependency, unsubscribe] of this.dependencies) {
			if (nextDependencies.has(dependency)) {
				continue;
			}

			unsubscribe();
			this.dependencies.delete(dependency);
		}

		for (const dependency of nextDependencies) {
			if (this.dependencies.has(dependency)) {
				continue;
			}

			this.dependencies.set(dependency, dependency.subscribe(this.handleDependencyChange));
		}
	}
}

function resolveSignalNode(signal: Signal<unknown>): WatchableSignal {
	if (!(signal instanceof SignalNode)) {
		throw new TypeError('Expected a signal created by @ecopages/signals.');
	}

	return signal;
}

function runWatcherNotify(callback: () => void): void {
	frozenWatcherDepth += 1;

	try {
		callback();
	} finally {
		frozenWatcherDepth -= 1;
	}
}

/**
 * Low-level watcher used to schedule work when watched signals may have become
 * stale.
 *
 * This API follows the proposal-shaped watcher model: each call to `watch(...)`
 * re-arms the watcher by clearing the pending set and resetting its single
 * notification latch so future invalidations can be observed as a fresh cycle.
 */
export class Watcher {
	private notified = false;
	private readonly pendingSignals = new Map<WatchableSignal, Signal<unknown>>();
	private readonly signals = new Map<WatchableSignal, Signal<unknown>>();
	private readonly unsubscribers = new Map<WatchableSignal, () => void>();

	/** Creates a watcher with a callback invoked when any watched signal becomes stale. */
	constructor(private readonly notifyCallback: (this: Watcher) => void) {}

	/** Returns the signals invalidated since the last `watch(...)` reset. */
	public getPending(): Signal<unknown>[] {
		return Array.from(this.pendingSignals.values());
	}

	/**
	 * Stops watching the provided signals.
	 *
	 * When the last watched signal is removed, the watcher also clears its pending
	 * set and notification latch.
	 */
	public unwatch(...signals: Signal<unknown>[]): void {
		assertSignalAccessAllowed();

		for (const signal of signals) {
			const node = resolveSignalNode(signal);
			const unsubscribe = this.unsubscribers.get(node);

			if (!unsubscribe) {
				throw new Error('Signal is not watched by this watcher.');
			}
		}

		for (const signal of signals) {
			const node = resolveSignalNode(signal);
			const unsubscribe = this.unsubscribers.get(node);

			unsubscribe?.();
			this.pendingSignals.delete(node);
			this.signals.delete(node);
			this.unsubscribers.delete(node);
		}

		if (this.signals.size === 0) {
			this.pendingSignals.clear();
			this.notified = false;
		}
	}

	/**
	 * Starts watching the provided signals.
	 *
	 * Re-watching is also a reset point: the watcher clears its pending set and
	 * notification latch so `getPending()` only reports invalidations that happen
	 * after this call.
	 */
	public watch(...signals: Signal<unknown>[]): void {
		assertSignalAccessAllowed();

		for (const signal of signals) {
			const node = resolveSignalNode(signal);

			if (this.signals.has(node)) {
				continue;
			}

			this.signals.set(node, signal);
			this.unsubscribers.set(
				node,
				node.addWatcher(() => {
					this.handleSignalChange(node);
				}),
			);
		}

		this.pendingSignals.clear();
		this.notified = false;
	}

	private handleSignalChange(node: WatchableSignal): void {
		const signal = this.signals.get(node);

		if (!signal) {
			return;
		}

		this.pendingSignals.set(node, signal);

		if (this.notified) {
			return;
		}

		this.notified = true;
		runWatcherNotify(() => {
			this.notifyCallback.call(this);
		});
	}
}

/** Creates a writable state signal. */
export function state<Value>(initialValue: Value, options?: SignalOptions<Value>): State<Value> {
	return new State(initialValue, options);
}

/** Creates a computed signal. */
export function computed<Value>(
	computeValue: ComputedCallback<Value>,
	options?: SignalOptions<Value>,
): Computed<Value> {
	return new Computed(computeValue, options);
}

/** Returns the computed signal currently being evaluated, if any. */
export function currentComputed(): Computed<unknown> | null {
	return currentComputedSignal();
}

/**
 * Reads a signal without registering the read as a dependency of the current
 * computed or effect.
 */
export function untrack<Value>(read: () => Value): Value {
	const previousActiveDependencyRecorder = activeDependencyRecorder;
	activeDependencyRecorder = undefined;

	try {
		return read();
	} finally {
		activeDependencyRecorder = previousActiveDependencyRecorder;
	}
}

/** Reads a signal without tracking it. */
export function peek<Value>(signal: Signal<Value>): Value {
	return untrack(() => signal.get());
}

/**
 * Runs a reactive side effect and re-schedules it when one of the signals read
 * during execution changes.
 */
export function effect(callback: EffectCallback, options: EffectOptions = {}): () => void {
	const runner = new EffectRunner(callback, options);
	runner.run();
	return () => {
		runner.dispose();
	};
}

/**
 * Watches a derived value and invokes `notify` when the value changes under the
 * configured equality function.
 */
export function watch<Value>(
	read: () => Value,
	notify: (nextValue: Value, previousValue: Value | undefined) => void,
	options: WatchOptions<Value> = {},
): () => void {
	const watchedValue = new Computed(read, { equals: options.equals });
	let previousValue: Value | undefined;
	let initialized = false;

	return effect(
		() => {
			const nextValue = watchedValue.get();

			if (initialized) {
				notify(nextValue, previousValue);
			} else if (options.immediate) {
				notify(nextValue, undefined);
			}

			previousValue = nextValue;
			initialized = true;
		},
		{ scheduler: options.scheduler },
	);
}

/** Proposal-shaped low-level APIs for framework and adapter authors. */
export const subtle = Object.freeze({
	Watcher,
	currentComputed,
	untrack,
	watched,
	unwatched,
});

/** Returns `true` when `value` is a deep reactive store created by this package. */
export function isStore(value: unknown): value is SignalStore<object> {
	return typeof value === 'object' && value !== null && storeNodeLookup.has(value);
}

/** Creates a deep reactive store backed by nested state signals. */
export function createStore<Value extends object>(initialValue: Value): SignalStore<Value> {
	return createStoreNode(initialValue).proxy;
}

/** Materializes the current plain snapshot of a signal store or nested store value. */
export function snapshot<Value>(value: Value): Value {
	if (isStore(value)) {
		return snapshotStoreNode(getStoreNode(value)) as Value;
	}

	return snapshotNestedValue(value);
}

function createStoreBranch(value: object): StoreBranch {
	return {
		[STORE_BRANCH_SYMBOL]: true,
		node: createStoreNode(value),
	};
}

function createStoreEntryValue(value: unknown): StoreEntryValue {
	const normalizedValue = isStore(value) ? snapshot(value) : value;

	if (isStoreBranchValue(normalizedValue)) {
		return createStoreBranch(normalizedValue);
	}

	return normalizedValue;
}

function createStoreNode<Value extends object>(initialValue: Value): StoreNode<Value> {
	const valueType = Array.isArray(initialValue) ? 'array' : 'object';
	const target = (valueType === 'array' ? [] : {}) as Value;
	const node: StoreNode<Value> = {
		entries: new Map(),
		proxy: undefined as unknown as Value,
		shape: new State(0),
		target,
		valueType,
	};

	for (const key of Reflect.ownKeys(initialValue)) {
		const entry = new State<StoreEntryValue>(
			createStoreEntryValue((initialValue as Record<PropertyKey, unknown>)[key]),
		);
		node.entries.set(key, entry);
		Reflect.set(target as object, key, unwrapStoreEntryValue(peek(entry)));
	}

	if (Array.isArray(initialValue)) {
		(target as unknown as any[]).length = initialValue.length;
	}

	node.proxy = new Proxy(target, createStoreProxyHandler(node));
	storeNodeLookup.set(node.proxy as object, node as StoreNode<object>);
	return node;
}

function createStoreProxyHandler<Value extends object>(node: StoreNode<Value>): ProxyHandler<Value> {
	return {
		defineProperty(target, key, descriptor) {
			if ('value' in descriptor) {
				return applyStoreSet(node, key, descriptor.value);
			}

			const result = Reflect.defineProperty(target, key, descriptor);

			if (result) {
				node.shape.update((value) => value + 1);
			}

			return result;
		},

		deleteProperty(_target, key) {
			return deleteStoreProperty(node, key);
		},

		get(target, key, receiver) {
			if (node.valueType === 'array' && key === 'length') {
				node.shape.get();
				return Reflect.get(target, key, receiver);
			}

			if (hasOwnProperty.call(target, key)) {
				const entry = ensureStoreEntry(node, key);
				const value = entry.get();

				if (value === STORE_ABSENT) {
					return undefined;
				}

				return unwrapStoreEntryValue(value);
			}

			return Reflect.get(target, key, receiver);
		},

		getOwnPropertyDescriptor(target, key) {
			node.shape.get();
			return Reflect.getOwnPropertyDescriptor(target, key);
		},

		has(target, key) {
			node.shape.get();
			return Reflect.has(target, key);
		},

		ownKeys(target) {
			node.shape.get();
			return Reflect.ownKeys(target);
		},

		set(_target, key, value) {
			return applyStoreSet(node, key, value);
		},
	};
}

function getStoreNode(value: object): StoreNode<object> {
	const node = storeNodeLookup.get(value);

	if (!node) {
		throw new Error('Value is not a signal store.');
	}

	return node;
}

function applyStoreSet<Value extends object>(node: StoreNode<Value>, key: PropertyKey, value: unknown): boolean {
	if (node.valueType === 'array' && key === 'length') {
		return setStoreArrayLength(node as StoreNode<any[]>, value);
	}

	const entry = ensureStoreEntry(node, key);
	const hadOwn = hasOwnProperty.call(node.target, key);
	const previousLength = node.valueType === 'array' ? (node.target as unknown as any[]).length : undefined;
	const nextEntryValue = createStoreEntryValue(value);
	entry.set(nextEntryValue);
	Reflect.set(node.target as object, key, unwrapStoreEntryValue(nextEntryValue));

	if (!hadOwn) {
		node.shape.update((current) => current + 1);
	}

	if (node.valueType === 'array') {
		const nextLength = (node.target as unknown as any[]).length;

		if (previousLength !== nextLength) {
			node.shape.update((current) => current + 1);
		}
	}

	return true;
}

function deleteStoreProperty<Value extends object>(node: StoreNode<Value>, key: PropertyKey): boolean {
	if (!hasOwnProperty.call(node.target, key)) {
		return true;
	}

	const entry = ensureStoreEntry(node, key);
	entry.set(STORE_ABSENT);
	Reflect.deleteProperty(node.target as object, key);
	if (node.valueType === 'array' && key === 'length') {
		(node.target as unknown as any[]).length = 0;
	}
	node.shape.update((current) => current + 1);
	return true;
}

function ensureStoreEntry<Value extends object>(node: StoreNode<Value>, key: PropertyKey): State<StoreEntryValue> {
	let entry = node.entries.get(key);

	if (!entry) {
		entry = new State<StoreEntryValue>(STORE_ABSENT);
		node.entries.set(key, entry);
	}

	return entry;
}

function isStoreBranch(value: unknown): value is StoreBranch {
	return typeof value === 'object' && value !== null && STORE_BRANCH_SYMBOL in value;
}

function isStoreBranchValue(value: unknown): value is object {
	if (value === null || typeof value !== 'object') {
		return false;
	}

	if (Array.isArray(value)) {
		return true;
	}

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function setStoreArrayLength(node: StoreNode<any[]>, value: unknown): boolean {
	const nextLength = Number(value);

	if (!Number.isInteger(nextLength) || nextLength < 0) {
		throw new RangeError('Invalid array length.');
	}

	const target = node.target as unknown as any[];
	const previousLength = target.length;

	if (nextLength < previousLength) {
		for (let index = previousLength - 1; index >= nextLength; index -= 1) {
			deleteStoreProperty(node, String(index));
		}
	}

	target.length = nextLength;

	if (previousLength !== nextLength) {
		node.shape.update((current) => current + 1);
	}

	return true;
}

function snapshotNestedValue<Value>(value: Value): Value {
	if (Array.isArray(value)) {
		return value.map((item) => snapshotNestedValue(item)) as Value;
	}

	if (isStore(value)) {
		return snapshot(value);
	}

	if (isStoreBranchValue(value)) {
		const result: Record<PropertyKey, unknown> = {};

		for (const key of Reflect.ownKeys(value)) {
			result[key] = snapshotNestedValue((value as Record<PropertyKey, unknown>)[key]);
		}

		return result as Value;
	}

	return value;
}

function snapshotStoreNode<Value extends object>(node: StoreNode<Value>): Value {
	const result = (node.valueType === 'array' ? [] : {}) as Value;

	for (const key of Reflect.ownKeys(node.target)) {
		const entry = ensureStoreEntry(node, key);
		const value = peek(entry);

		if (value === STORE_ABSENT) {
			continue;
		}

		Reflect.set(result as object, key, snapshotNestedValue(unwrapStoreEntryValue(value)));
	}

	if (node.valueType === 'array') {
		(result as unknown as any[]).length = (node.target as unknown as any[]).length;
	}

	return result;
}

function unwrapStoreEntryValue(value: StoreEntryValue): unknown {
	if (value === STORE_ABSENT) {
		return undefined;
	}

	if (isStoreBranch(value)) {
		return value.node.proxy;
	}

	return value;
}
