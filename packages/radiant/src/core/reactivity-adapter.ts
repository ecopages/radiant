import { getReactiveRuntime } from './reactivity-runtime';
export type {
	ReactiveComputed,
	ReactiveDependencyNode,
	ReactiveRuntime,
	ReactiveSubscriber,
	ReactiveWatcher,
} from './reactivity-contract';
export { setReactiveRuntime } from './reactivity-runtime';

/** Tracks one dependency-node read against the active internal reactivity runtime. */
export function trackReactiveDependency(node: import('./reactivity-contract').ReactiveDependencyNode): void {
	getReactiveRuntime().trackDependency(node);
}

/** Creates a computed value using the currently selected internal reactivity runtime. */
export function createReactiveComputed<T>(read: () => T): import('./reactivity-contract').ReactiveComputed<T> {
	return getReactiveRuntime().createComputed(read);
}

/** Creates a watcher using the currently selected internal reactivity runtime. */
export function createReactiveWatcher(notify: () => void): import('./reactivity-contract').ReactiveWatcher {
	return getReactiveRuntime().createWatcher(notify);
}
