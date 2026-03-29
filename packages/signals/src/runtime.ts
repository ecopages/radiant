import type { Computed } from './computed';
import type { DependencyNode, EffectScheduler, SignalEquals } from './types';

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
