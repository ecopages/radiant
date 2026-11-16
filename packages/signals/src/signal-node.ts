import { trackActiveDependency } from './runtime';
import {
	watched,
	unwatched,
	type DependencyNode,
	type Signal,
	type SignalOptions,
	type SignalSubscriber,
} from './types';

/**
 * Runs every task even when earlier ones throw, and returns what they threw.
 */
export function collectErrors(tasks: Iterable<() => void>): unknown[] {
	const errors: unknown[] = [];

	for (const task of tasks) {
		try {
			task();
		} catch (error) {
			errors.push(error);
		}
	}

	return errors;
}

/**
 * Throws the only error as is, or several as an `AggregateError` whose message
 * defaults to the unwatched-hook one.
 */
export function throwCollected(errors: unknown[], message = 'Multiple unwatched hooks failed.'): void {
	if (errors.length === 1) {
		throw errors[0];
	}

	if (errors.length > 1) {
		throw new AggregateError(errors, message);
	}
}

/**
 * Shared signal implementation used by writable and computed signals.
 *
 * It centralizes subscriber delivery, monotonic versioning, and the low-level
 * watcher hooks consumed by `subtle.Watcher`.
 */
export abstract class SignalNode<Value> implements Signal<Value>, DependencyNode {
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

	/**
	 * Registers a watcher listener, running `watched` when it is the first.
	 *
	 * @remarks
	 * Adding is atomic: if `watched` or the first-watcher work throws, the listener
	 * and, unless a listener was added meanwhile, anything the first-watcher work
	 * subscribed are released, `unwatched` is
	 * not called for this node (it never became watched), and the original error
	 * is rethrown. An error thrown while releasing is dropped in favor of it.
	 *
	 * The returned unsubscriber always finishes releasing the node before it
	 * rethrows an error from a dependency's or this node's `unwatched` hook.
	 */
	public addWatcher(notify: () => void): () => void {
		const wasEmpty = this.watcherListeners.size === 0;
		this.watcherListeners.add(notify);

		if (wasEmpty) {
			try {
				this.handleFirstWatcherAdded();
				this.onWatched?.call(this);
			} catch (error) {
				this.watcherListeners.delete(notify);
				if (this.watcherListeners.size === 0) {
					collectErrors([() => this.handleLastWatcherRemoved(true)]);
				}
				throw error;
			}
		}

		return () => {
			if (!this.watcherListeners.delete(notify)) {
				return;
			}

			if (this.watcherListeners.size === 0) {
				throwCollected(
					collectErrors([() => this.handleLastWatcherRemoved(false), () => this.onUnwatched?.call(this)]),
				);
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
		trackActiveDependency(this);
	}

	protected handleFirstWatcherAdded(): void {}

	/**
	 * @remarks
	 * `rollback` is true when a failed first watch is being undone, so dependencies
	 * are released in the reverse of the order they were watched.
	 */
	protected handleLastWatcherRemoved(_rollback: boolean): void {}

	protected publish(nextValue: Value): void {
		for (const subscriber of this.subscribers) {
			subscriber(nextValue);
		}
	}

	protected notifyWatchers(): void {
		throwCollected(collectErrors(this.watcherListeners), 'Multiple watcher notifications failed.');
	}
}

export function resolveSignalNode(signal: Signal<unknown>): SignalNode<unknown> {
	if (!(signal instanceof SignalNode)) {
		throw new TypeError('Expected a signal created by @ecopages/signals.');
	}

	return signal;
}
