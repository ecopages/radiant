import type { Computed } from './computed';
import type { DependencyNode, EffectScheduler, SignalEquals } from './types';

/**
 * Module-local ambient tracking. Do not put this on `globalThis` — duplicate
 * package copies each get their own recorder and break shared reactive graphs.
 */
let activeDependencyRecorder: ((dependency: DependencyNode) => void) | undefined;
let activeComputedSignal: Computed<any> | undefined;
let frozenWatcherDepth = 0;

export const defaultEquals: SignalEquals<unknown> = function (previousValue, nextValue) {
	return Object.is(previousValue, nextValue);
};

export const scheduleMicrotask: EffectScheduler = (run) => {
	queueMicrotask(run);
};

export function assertSignalAccessAllowed(): void {
	if (frozenWatcherDepth > 0) {
		throw new Error('Cannot read or write signals during a Watcher notification.');
	}
}

export function currentComputedSignal(): Computed<unknown> | null {
	return activeComputedSignal ?? null;
}

export function getActiveComputedSignal(): Computed<any> | undefined {
	return activeComputedSignal;
}

export function setActiveComputedSignal(nextSignal: Computed<any> | undefined): void {
	activeComputedSignal = nextSignal;
}

export function getActiveDependencyRecorder(): ((dependency: DependencyNode) => void) | undefined {
	return activeDependencyRecorder;
}

export function setActiveDependencyRecorder(nextRecorder: ((dependency: DependencyNode) => void) | undefined): void {
	activeDependencyRecorder = nextRecorder;
}

export function trackActiveDependency(dependency: DependencyNode): void {
	activeDependencyRecorder?.(dependency);
}

export function runWatcherNotify(callback: () => void): void {
	frozenWatcherDepth += 1;

	try {
		callback();
	} finally {
		frozenWatcherDepth -= 1;
	}
}

let storeBatchDepth = 0;
let flushingStoreNotifications = false;
const pendingStoreNotifications = new Map<object, () => void>();

/**
 * @remarks During reconciliation, defer each state until all branch writes are visible.
 * A reentrant write to a state already queued replaces its pending notification.
 */
export function deferStoreNotification(key: object, notify: () => void): boolean {
	if (storeBatchDepth === 0 && (!flushingStoreNotifications || !pendingStoreNotifications.has(key))) return false;
	pendingStoreNotifications.set(key, notify);
	return true;
}

/**
 * @remarks Drain every pending notification even if a write or subscriber throws,
 * so observers of other changed values are not left stale.
 */
export function batchStoreWrites(write: () => void): void {
	storeBatchDepth += 1;
	const errors: unknown[] = [];
	try {
		write();
	} catch (error) {
		errors.push(error);
	} finally {
		storeBatchDepth -= 1;
	}
	if (storeBatchDepth === 0 && !flushingStoreNotifications) {
		flushingStoreNotifications = true;
		try {
			while (pendingStoreNotifications.size > 0) {
				const next = pendingStoreNotifications.entries().next();
				if (next.done) break;
				const [key, notify] = next.value;
				pendingStoreNotifications.delete(key);
				try {
					notify();
				} catch (error) {
					errors.push(error);
				}
			}
		} finally {
			flushingStoreNotifications = false;
		}
	}
	if (errors.length === 1) throw errors[0];
	if (errors.length > 1) throw new AggregateError(errors, 'Multiple store updates or notifications failed.');
}
