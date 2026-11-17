import { assertSignalAccessAllowed, defaultEquals } from './runtime';
import { SignalNode } from './signal-node';
import type { Signal, SignalEquals, SignalOptions, SignalSubscriber } from './types';

/** Starts listening to an external store and returns a function that stops. */
export type ExternalStoreSubscribe = (onStoreChange: () => void) => () => void;

/**
 * A store that matches React's `useSyncExternalStore` contract, or Zustand/Redux
 * `subscribe` plus `getState`.
 *
 * @remarks `getSnapshot` (or `getState`) is the client read. `getServerSnapshot`,
 * when present, is the read until the signal first subscribes to the store (a host
 * connect, an effect, or a computed that has a subscriber), and never after that.
 * Writes stay on the store.
 */
export type ExternalStoreSource<Snapshot> = {
	subscribe: ExternalStoreSubscribe;
	getServerSnapshot?: () => Snapshot;
} & (
	{ getSnapshot: () => Snapshot; getState?: () => Snapshot } | { getState: () => Snapshot; getSnapshot?: undefined }
);

/**
 * Read-only signal over an external store.
 *
 * @remarks The store is subscribed on the first imperative subscriber or watcher,
 * and released when both fall to zero. `get()` without a subscription never calls
 * `store.subscribe`: it returns `getServerSnapshot()` until the signal has first
 * subscribed, and the client snapshot from then on. `select` runs only when the
 * snapshot is a new reference, so a notification that kept the snapshot, or a
 * repeated `get()`, reuses the last selection. A selected value that `equals`
 * (default `Object.is`) the previous one does not notify. An error thrown by
 * `select` is rethrown by `get()` until a later snapshot selects without one; it
 * never reaches the store's listener loop.
 */
export function fromExternalStore<Snapshot, Selected = Snapshot>(
	store: ExternalStoreSource<Snapshot>,
	select?: (snapshot: Snapshot) => Selected,
	options?: SignalOptions<Selected>,
): Signal<Selected> {
	return new ExternalStoreSignal(store, select, options);
}

class ExternalStoreSignal<Snapshot, Selected> extends SignalNode<Selected> implements Signal<Selected> {
	private attached = false;
	/**
	 * @remarks Set when a read selected a snapshot the store has not notified yet, so
	 * the store listener that follows still notifies although nothing is left to select.
	 */
	private changedSinceNotify = false;
	private error: unknown;
	private failed = false;
	private hasSnapshot = false;
	private hydrated = false;
	private snapshot!: Snapshot;
	private storeUnsubscribe: (() => void) | undefined;
	private value!: Selected;
	private readonly equals: SignalEquals<Selected>;
	private readonly getClientSnapshot: () => Snapshot;
	private readonly getServerSnapshot: (() => Snapshot) | undefined;
	private readonly select: (snapshot: Snapshot) => Selected;
	private readonly subscribeToStore: ExternalStoreSubscribe;

	constructor(
		store: ExternalStoreSource<Snapshot>,
		select: ((snapshot: Snapshot) => Selected) | undefined,
		options: SignalOptions<Selected> = {},
	) {
		super(options);
		const getClientSnapshot = store.getSnapshot ?? store.getState;

		if (!getClientSnapshot) {
			throw new TypeError('fromExternalStore requires getSnapshot or getState.');
		}

		this.getClientSnapshot = getClientSnapshot;
		this.getServerSnapshot = store.getServerSnapshot;
		this.select = select ?? (identity as (snapshot: Snapshot) => Selected);
		this.equals = (options.equals ?? defaultEquals) as SignalEquals<Selected>;
		this.subscribeToStore = store.subscribe;
	}

	/**
	 * @remarks While subscribed, a snapshot newer than the last store notification is
	 * selected here too, so a computed that reads two signals over one store from
	 * inside the first one's notification sees both from the same snapshot.
	 */
	public get(): Selected {
		assertSignalAccessAllowed();

		if (this.refresh() && this.attached) {
			this.changedSinceNotify = true;
		}

		this.connectToActiveComputed();

		if (this.failed) {
			throw this.error;
		}

		return this.value;
	}

	/**
	 * @remarks The first subscriber subscribes to the store, and is called at once when
	 * the client snapshot selects another value than the last read (the server snapshot).
	 * If subscribing throws, the subscriber is removed and the error rethrown.
	 */
	public subscribe(notify: SignalSubscriber<Selected>): () => void {
		this.subscribers.add(notify);

		try {
			this.attach();
		} catch (error) {
			this.subscribers.delete(notify);
			this.detachIfIdle();
			throw error;
		}

		return () => {
			if (this.subscribers.delete(notify)) {
				this.detachIfIdle();
			}
		};
	}

	protected override handleFirstWatcherAdded(): void {
		this.attach();
	}

	protected override handleLastWatcherRemoved(): void {
		this.detachIfIdle();
	}

	protected override rollbackFirstWatcher(): void {
		this.detachIfIdle();
	}

	private attach(): void {
		if (this.attached) {
			return;
		}

		if (!this.hasSnapshot) {
			this.refresh();
		}

		this.hydrated = true;
		this.storeUnsubscribe = this.subscribeToStore(() => this.onStoreChange());
		this.attached = true;
		this.onStoreChange();
	}

	private detachIfIdle(): void {
		if (!this.attached || this.subscribers.size > 0 || this.getWatcherCount() > 0) {
			return;
		}

		const unsubscribe = this.storeUnsubscribe;
		this.attached = false;
		this.storeUnsubscribe = undefined;
		unsubscribe?.();
	}

	/** @remarks Watchers are notified before subscribers, and a watcher error is rethrown after them, as `State.set` does. */
	private onStoreChange(): void {
		if (!this.refresh() && !this.changedSinceNotify) {
			return;
		}

		this.changedSinceNotify = false;
		let watcherError: unknown;

		try {
			this.notifyWatchers();
		} catch (error) {
			watcherError = error;
		}

		if (!this.failed) {
			this.publish(this.value);
		}

		if (watcherError) {
			throw watcherError;
		}
	}

	/** Selects from the current snapshot when it is a new reference, and reports whether the exposed value changed. */
	private refresh(): boolean {
		const snapshot = this.hydrated || !this.getServerSnapshot ? this.getClientSnapshot() : this.getServerSnapshot();

		if (this.hasSnapshot && Object.is(snapshot, this.snapshot)) {
			return false;
		}

		const compare = this.hasSnapshot && !this.failed;
		this.snapshot = snapshot;
		this.hasSnapshot = true;

		try {
			const next = this.select(snapshot);

			if (compare && this.equals.call(this, this.value, next)) {
				return false;
			}

			this.value = next;
			this.failed = false;
		} catch (error) {
			this.error = error;
			this.failed = true;
		}

		this.version += 1;
		return true;
	}
}

function identity<Value>(value: Value): Value {
	return value;
}
