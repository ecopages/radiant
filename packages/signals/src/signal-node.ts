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
		trackActiveDependency(this);
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

export function resolveSignalNode(signal: Signal<unknown>): SignalNode<unknown> {
	if (!(signal instanceof SignalNode)) {
		throw new TypeError('Expected a signal created by @ecopages/signals.');
	}

	return signal;
}
