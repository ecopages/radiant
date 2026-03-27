/** Callback invoked when a signal's current value changes. */
export type SignalSubscriber<Value> = (value: Value) => void;
/** Optional configuration shared by writable and computed signals. */
export interface SignalOptions<Value> {
	/**
	 * Equality comparison used to suppress redundant updates.
	 *
	 * Defaults to `Object.is`.
	 */
	equals?: (previousValue: Value, nextValue: Value) => boolean;
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
declare abstract class SignalNode<Value> implements Signal<Value> {
	protected readonly subscribers: Set<SignalSubscriber<Value>>;
	protected version: number;
	abstract get(): Value;
	abstract subscribe(notify: SignalSubscriber<Value>): () => void;
	getVersion(): number;
	protected connectToActiveComputed(): void;
	protected publish(nextValue: Value): void;
}
/**
 * Writable state signal.
 *
 * State signals are the smallest unit of mutable reactive data in this package.
 */
export declare class State<Value> extends SignalNode<Value> implements WritableSignal<Value> {
	private readonly equals;
	private value;
	constructor(initialValue: Value, options?: SignalOptions<Value>);
	get(): Value;
	set(nextValue: Value): void;
	update(updater: (value: Value) => Value): void;
	subscribe(notify: SignalSubscriber<Value>): () => void;
}
/**
 * Lazily derived signal backed by other signals read during evaluation.
 *
 * Dependencies are discovered automatically each time the computation runs.
 */
export declare class Computed<Value> extends SignalNode<Value> {
	private readonly compute;
	private readonly dependencyUnsubscribers;
	private readonly equals;
	private dependencies;
	private computing;
	private initialized;
	private pendingDependencies;
	private stale;
	private value;
	constructor(compute: () => Value, options?: SignalOptions<Value>);
	get(): Value;
	subscribe(notify: SignalSubscriber<Value>): () => void;
	private clearDependencySubscriptions;
	private handleDependencyChange;
	private haveDependenciesChanged;
	private recompute;
	private refreshIfNeeded;
	private syncDependencySubscriptions;
	private trackDependency;
}
/** Creates a writable state signal. */
export declare function state<Value>(initialValue: Value, options?: SignalOptions<Value>): State<Value>;
/** Creates a computed signal. */
export declare function computed<Value>(computeValue: () => Value, options?: SignalOptions<Value>): Computed<Value>;
/**
 * Reads a signal without registering the read as a dependency of the current
 * computed or effect.
 */
export declare function untrack<Value>(read: () => Value): Value;
/** Reads a signal without tracking it. */
export declare function peek<Value>(signal: Signal<Value>): Value;
/**
 * Runs a reactive side effect and re-schedules it when one of the signals read
 * during execution changes.
 */
export declare function effect(callback: EffectCallback, options?: EffectOptions): () => void;
/**
 * Watches a derived value and invokes `notify` when the value changes under the
 * configured equality function.
 */
export declare function watch<Value>(
	read: () => Value,
	notify: (nextValue: Value, previousValue: Value | undefined) => void,
	options?: WatchOptions<Value>,
): () => void;
/** Returns `true` when `value` is a deep reactive store created by this package. */
export declare function isStore(value: unknown): value is SignalStore<object>;
/** Creates a deep reactive store backed by nested state signals. */
export declare function createStore<Value extends object>(initialValue: Value): SignalStore<Value>;
/** Materializes the current plain snapshot of a signal store or nested store value. */
export declare function snapshot<Value>(value: Value): Value;
