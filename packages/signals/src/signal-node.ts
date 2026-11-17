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
 * @remarks Marks the aggregates {@link throwCollected} produced, so only those
 * are flattened into a later one.
 */
class CollectedErrors extends AggregateError {}

/**
 * Throws the only error as is, or several as an `AggregateError` whose message
 * defaults to the unwatched-hook one.
 *
 * @remarks An `AggregateError` this function threw earlier, such as one from a
 * dependency's release, is flattened into the new one, so a failure is never
 * nested. One a hook threw itself is kept as an error of its own.
 */
export function throwCollected(errors: unknown[], message = 'Multiple unwatched hooks failed.'): void {
	if (errors.length === 1) {
		throw errors[0];
	}

	if (errors.length > 1) {
		throw new CollectedErrors(
			errors.flatMap((error) => (error instanceof CollectedErrors ? error.errors : [error])),
			message,
		);
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
	 * is removed, `unwatched` is not called for this node (it never became watched),
	 * and the original error is rethrown. When this node's own `watched` hook
	 * throws, the work the first watcher started is also released, unless a
	 * listener was added meanwhile. An error thrown while releasing is dropped in favor of it.
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
					collectErrors([() => this.rollbackFirstWatcher()]);
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
					collectErrors([() => this.handleLastWatcherRemoved(), () => this.onUnwatched?.call(this)]),
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

	protected handleLastWatcherRemoved(): void {}

	/**
	 * Undoes {@link handleFirstWatcherAdded} after a failed first watch.
	 *
	 * @remarks An error from the release is dropped in favor of the one that
	 * failed the watch. Dependencies are released in the reverse of the order
	 * they were watched.
	 */
	protected rollbackFirstWatcher(): void {}

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
