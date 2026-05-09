import {
	Computed as SignalsComputed,
	subtle,
	trackDependency,
	type DependencyNode as SignalsDependencyNode,
} from '@ecopages/signals';
import type { ReactiveComputed, ReactiveDependencyNode, ReactiveRuntime, ReactiveWatcher } from './reactivity-contract';

function asSignalsDependencyNode(node: ReactiveDependencyNode): SignalsDependencyNode {
	return node as SignalsDependencyNode;
}

function asSignalsComputed(signal: ReactiveComputed<unknown>): SignalsComputed<unknown> {
	return signal as SignalsComputed<unknown>;
}

/**
 * Default Signals-backed implementation of Radiant's internal reactivity
 * runtime contract.
 *
 * This is the only core module that imports `@ecopages/signals` directly. The
 * rest of core consumes the narrower runtime contract through the adapter and
 * runtime holder modules.
 */
export const signalsReactiveRuntime: ReactiveRuntime = {
	trackDependency(node) {
		trackDependency(asSignalsDependencyNode(node));
	},
	createComputed<T>(read: () => T): ReactiveComputed<T> {
		return new SignalsComputed(read);
	},
	createWatcher(notify: () => void): ReactiveWatcher {
		const watcher = new subtle.Watcher(notify);

		return {
			watch(signal) {
				watcher.watch(asSignalsComputed(signal));
			},
			unwatch(signal) {
				watcher.unwatch(asSignalsComputed(signal));
			},
		};
	},
};
