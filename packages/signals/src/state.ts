import { assertSignalAccessAllowed, defaultEquals } from './runtime';
import { SignalNode } from './signal-node';
import type { SignalEquals, SignalOptions, SignalSubscriber, WritableSignal } from './types';

/**
 * Writable state signal.
 *
 * State signals are the smallest unit of mutable reactive data in this package.
 */
export class State<Value> extends SignalNode<Value> implements WritableSignal<Value> {
	private readonly equals: SignalEquals<Value>;
	private value: Value;

	/**
	 * Creates a writable signal with an initial value.
	 *
	 * The optional `equals` callback can suppress redundant writes, and the
	 * watcher hooks integrate with `subtle.Watcher` lifecycle events.
	 */
	constructor(initialValue: Value, options: SignalOptions<Value> = {}) {
		super(options);
		this.value = initialValue;
		this.equals = (options.equals ?? defaultEquals) as SignalEquals<Value>;
	}

	/**
	 * Returns the current value and records this state as a dependency when a
	 * computation is actively collecting dependencies.
	 */
	public get(): Value {
		assertSignalAccessAllowed();
		this.connectToActiveComputed();
		return this.value;
	}

	/**
	 * Replaces the current value.
	 *
	 * Watchers are notified before imperative subscribers so low-level invalidation
	 * can observe the stale transition before push listeners run.
	 */
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

	/**
	 * Updates the current value using the previous one and then forwards to
	 * `set(...)` so equality checks and notifications stay consistent.
	 */
	public update(updater: (value: Value) => Value): void {
		this.set(updater(this.value));
	}

	/**
	 * Registers an imperative subscriber.
	 *
	 * Subscriptions do not trigger an immediate call and are independent from the
	 * automatic dependency tracking used by computed values and effects.
	 */
	public subscribe(notify: SignalSubscriber<Value>): () => void {
		this.subscribers.add(notify);

		return () => {
			this.subscribers.delete(notify);
		};
	}
}

/**
 * Creates a writable state signal.
 *
 * This is equivalent to `new State(...)` and can be useful in codebases that
 * prefer factory-style construction.
 */
export function state<Value>(initialValue: Value, options?: SignalOptions<Value>): State<Value> {
	return new State(initialValue, options);
}
