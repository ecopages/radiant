import type { Computed } from './computed';

/**
 * Imperative listener invoked after a signal publishes a new exposed value.
 *
 * Subscribers are separate from automatic dependency tracking and are mainly
 * useful for adapters, bridge code, or tests that need push-based updates.
 */
export type SignalSubscriber<Value> = (value: Value) => void;

/** Hook invoked when a signal becomes watched through `subtle.Watcher`. */
export const watched = Symbol.for('@ecopages/signals.subtle.watched');

/** Hook invoked when a signal stops being watched through `subtle.Watcher`. */
export const unwatched = Symbol.for('@ecopages/signals.subtle.unwatched');

export type SignalEquals<Value> = (this: Signal<Value>, previousValue: Value, nextValue: Value) => boolean;

export type ComputedCallback<Value> = (this: Computed<Value>) => Value;

/**
 * Optional configuration shared by writable and computed signals.
 *
 * These hooks control equality and low-level watcher lifecycle integration.
 */
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

/**
 * Read-only signal contract.
 *
 * Reading from a signal participates in dependency discovery when a computed
 * signal or effect is currently collecting dependencies.
 */
export interface Signal<Value> {
	/**
	 * Returns the current value.
	 *
	 * Reads performed during a tracked computation register this signal as a
	 * dependency of that computation.
	 */
	get(): Value;

	/**
	 * Subscribes to exposed value changes.
	 *
	 * Subscribers are only called when the signal's value changes according to
	 * its configured equality function.
	 */
	subscribe(notify: SignalSubscriber<Value>): () => void;
}

/**
 * Read-write signal contract.
 *
 * Writable signals expose direct writes in addition to dependency-tracked
 * reads.
 */
export interface WritableSignal<Value> extends Signal<Value> {
	/**
	 * Replaces the current value.
	 *
	 * No invalidation happens when the configured equality function reports the
	 * new value as equal to the current one.
	 */
	set(nextValue: Value): void;

	/**
	 * Replaces the current value by deriving the next one from the current one.
	 */
	update(updater: (value: Value) => Value): void;
}

/** Scheduler used to defer effect re-execution. */
export type EffectScheduler = (run: () => void) => void;

/** Cleanup function returned from an effect body. */
export type EffectCleanup = void | (() => void);

/** Callback executed by an effect. */
export type EffectCallback = () => EffectCleanup;

/**
 * Configuration for an effect.
 *
 * Effects default to microtask scheduling so multiple synchronous writes can
 * collapse into a single rerun.
 */
export interface EffectOptions {
	/** Scheduler used after a dependency changes. Defaults to a microtask queue. */
	scheduler?: EffectScheduler;
}

/**
 * Configuration for `watch(...)`.
 *
 * Watches reuse computed-style equality and effect-style scheduling.
 */
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

export interface DependencyNode extends Signal<unknown> {
	addWatcher(notify: () => void): () => void;
	getVersion(): number;
}
