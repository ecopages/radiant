import { assertSignalAccessAllowed, defaultEquals } from './runtime';
import { SignalNode } from './signal-node';
import type { Signal, SignalEquals, SignalSubscriber } from './types';

/** Starts listening to an external store and returns a function that stops. */
export type ExternalStoreSubscribe = (onStoreChange: () => void) => () => void;

/**
 * A store that matches React's `useSyncExternalStore` contract, or Zustand/Redux
 * `subscribe` plus `getState`.
 *
 * @remarks `getSnapshot` and `getState` are the client read. `getServerSnapshot`,
 * when present, is the only read until something subscribes (a host connect, an
 * effect, or a computed that has a subscriber). Writes stay on the store.
 */
export type ExternalStoreSource<Snapshot> = {
	subscribe: ExternalStoreSubscribe;
	getSnapshot?: () => Snapshot;
	getState?: () => Snapshot;
	getServerSnapshot?: () => Snapshot;
};

/**
 * Read-only signal over an external store.
 *
 * @remarks The store is subscribed on the first imperative subscriber or
 * watcher, and released when both fall to zero. `get()` without a subscription
 * never calls `store.subscribe`: it returns `getServerSnapshot()` when that
 * exists, otherwise the live snapshot. After subscribe, `get()` follows the
 * client snapshot. A selector that returns a value `Object.is` equal to the
 * previous one does not notify.
 */
export function fromExternalStore<Snapshot, Selected = Snapshot>(
	store: ExternalStoreSource<Snapshot>,
	select?: (snapshot: Snapshot) => Selected,
	options?: { equals?: (previous: Selected, next: Selected) => boolean },
): Signal<Selected> {
	return new ExternalStoreSignal(store, select, options?.equals);
}

class ExternalStoreSignal<Snapshot, Selected> extends SignalNode<Selected> implements Signal<Selected> {
	private attached = false;
	private readonly equals: SignalEquals<Selected>;
	private readonly readSnapshot: (preferServer: boolean) => Snapshot;
	private readonly select: (snapshot: Snapshot) => Selected;
	private readonly subscribeToStore: ExternalStoreSubscribe;
	private storeUnsubscribe: (() => void) | undefined;
	private value: Selected;

	constructor(
		store: ExternalStoreSource<Snapshot>,
		select: ((snapshot: Snapshot) => Selected) | undefined,
		equals: ((previous: Selected, next: Selected) => boolean) | undefined,
	) {
		super();
		this.readSnapshot = bindSnapshotReader(store);
		this.select = select ?? (identity as (snapshot: Snapshot) => Selected);
		this.equals = (equals ?? defaultEquals) as SignalEquals<Selected>;
		this.subscribeToStore = store.subscribe;
		this.value = this.select(this.readSnapshot(true));
	}

	public get(): Selected {
		assertSignalAccessAllowed();
		this.connectToActiveComputed();

		if (this.attached) {
			return this.value;
		}

		const next = this.select(this.readSnapshot(true));

		if (!this.equals.call(this, this.value, next)) {
			this.value = next;
			this.version += 1;
		}

		return this.value;
	}

	public subscribe(notify: SignalSubscriber<Selected>): () => void {
		const wasEmpty = this.subscribers.size === 0;
		this.subscribers.add(notify);

		if (wasEmpty) {
			this.attach();
		}

		return () => {
			this.subscribers.delete(notify);
			this.detachIfIdle();
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

		this.attached = true;
		this.storeUnsubscribe = this.subscribeToStore(() => this.onStoreChange());
		this.onStoreChange();
	}

	private detachIfIdle(): void {
		if (this.subscribers.size > 0 || this.getWatcherCount() > 0) {
			return;
		}

		this.storeUnsubscribe?.();
		this.storeUnsubscribe = undefined;
		this.attached = false;
	}

	private onStoreChange(): void {
		const next = this.select(this.readSnapshot(false));

		if (this.equals.call(this, this.value, next)) {
			return;
		}

		this.value = next;
		this.version += 1;
		this.notifyWatchers();
		this.publish(this.value);
	}
}

function identity<Value>(value: Value): Value {
	return value;
}

function bindSnapshotReader<Snapshot>(store: ExternalStoreSource<Snapshot>): (preferServer: boolean) => Snapshot {
	const getClientSnapshot = store.getSnapshot ?? store.getState;

	if (!getClientSnapshot) {
		throw new TypeError('fromExternalStore requires getSnapshot or getState.');
	}

	const getServerSnapshot = store.getServerSnapshot;

	return (preferServer) => {
		if (preferServer && getServerSnapshot) {
			return getServerSnapshot();
		}

		return getClientSnapshot();
	};
}
