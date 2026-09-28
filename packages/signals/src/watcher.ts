import { assertSignalAccessAllowed, runWatcherNotify } from './runtime';
import { resolveSignalNode } from './signal-node';
import type { Signal } from './types';

type WatchableSignal = ReturnType<typeof resolveSignalNode>;

/**
 * Low-level watcher used to schedule work when watched signals may have become
 * stale.
 *
 * This follows the proposal-shaped watcher model: every call to `watch(...)`
 * re-arms the watcher by clearing the pending set and resetting its single
 * notification latch for the next invalidation cycle.
 */
export class Watcher {
	private notified = false;
	private readonly pendingSignals = new Map<WatchableSignal, Signal<unknown>>();
	private readonly signals = new Map<WatchableSignal, Signal<unknown>>();
	private readonly unsubscribers = new Map<WatchableSignal, () => void>();

	/**
	 * Creates a watcher whose callback runs once per invalidation cycle until the
	 * watcher is re-armed with `watch(...)`.
	 */
	constructor(private readonly notifyCallback: (this: Watcher) => void) {}

	/**
	 * Returns the watched signals invalidated since the last `watch(...)` reset.
	 *
	 * The returned array preserves insertion order for the current pending set.
	 */
	public getPending(): Signal<unknown>[] {
		return Array.from(this.pendingSignals.values());
	}

	/**
	 * Stops watching the provided signals.
	 *
	 * Removing the last watched signal also clears the pending set and resets the
	 * notification latch.
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
	 * Re-watching is also a reset point, so `getPending()` only reports
	 * invalidations that happen after this call.
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
