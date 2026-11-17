import { assertSignalAccessAllowed, runWatcherNotify } from './runtime';
import { collectErrors, resolveSignalNode, throwCollected } from './signal-node';
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
	 * Removing the last watched signal also clears the pending set. The
	 * notification latch resets whenever nothing is left pending, so a later
	 * change to a signal that is still watched notifies again.
	 *
	 * @remarks
	 * Release is not interrupted by a throwing `unwatched` hook: every signal is
	 * released and every hook runs first, then the error is rethrown (several
	 * become one flat `AggregateError`). A signal is released just before its own
	 * hook, so a hook that writes a signal listed after it still notifies the
	 * watcher. The signals are no longer watched afterwards, so a retry reports
	 * them as not watched.
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

		const errors = this.release(signals.map(resolveSignalNode));

		if (this.signals.size === 0) {
			this.pendingSignals.clear();
		}

		if (this.pendingSignals.size === 0) {
			this.notified = false;
		}

		throwCollected(errors);
	}

	/**
	 * Starts watching the provided signals.
	 *
	 * @remarks
	 * Atomic: if a `watched` hook throws, every signal this call had started
	 * watching is released in reverse order (so each `unwatched` hook runs), the
	 * watcher keeps only the signals it watched before the call, and the original
	 * error is rethrown. Errors thrown while releasing are dropped in favor of it. The
	 * signals this call added are removed from the pending set, other pending
	 * signals stay, and the notification latch returns to its value before the
	 * call unless a signal is still pending. A `watched` hook that wrote to a
	 * signal added earlier in the call may therefore have run the callback once
	 * more than the latch would allow.
	 *
	 * Re-watching is also a reset point, so `getPending()` only reports
	 * invalidations that happen after this call.
	 */
	public watch(...signals: Signal<unknown>[]): void {
		assertSignalAccessAllowed();

		const added: WatchableSignal[] = [];
		const wasNotified = this.notified;

		try {
			for (const signal of signals) {
				const node = resolveSignalNode(signal);

				if (this.signals.has(node)) {
					continue;
				}

				this.signals.set(node, signal);
				added.push(node);
				this.unsubscribers.set(
					node,
					node.addWatcher(() => {
						this.handleSignalChange(node);
					}),
				);
			}
		} catch (error) {
			this.release(added.reverse());
			this.notified = wasNotified || this.pendingSignals.size > 0;
			throw error;
		}

		this.pendingSignals.clear();
		this.notified = false;
	}

	/**
	 * @remarks Each signal leaves the watcher immediately before its own release runs, so an `unwatched` hook sees the
	 * signals released before it as unwatched and the ones after it as still watched. A write to one of those later
	 * signals notifies the watcher, then the signal is released and no longer pending.
	 */
	private release(nodes: WatchableSignal[]): unknown[] {
		return collectErrors(
			nodes.map((node) => () => {
				const unsubscribe = this.unsubscribers.get(node);

				this.pendingSignals.delete(node);
				this.signals.delete(node);
				this.unsubscribers.delete(node);
				unsubscribe?.();
			}),
		);
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
