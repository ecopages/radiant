/**
 * Minimal dependency-node contract that Radiant core can publish into a
 * reactive runtime.
 *
 * The shape intentionally covers only the capabilities core needs for tracked
 * reads and watcher notifications, rather than exposing any concrete Signals
 * types to the rest of the package.
 */
export interface ReactiveDependencyNode {
	get(): unknown;
	subscribe(notify: ReactiveSubscriber<unknown>): () => void;
	addWatcher?(notify: () => void): () => void;
	getVersion?(): number;
}

/** Callback signature used when a dependency node publishes a new value. */
export interface ReactiveSubscriber<T> {
	(value: T): void;
}

/** Read-only computed value consumed by Radiant core render lifecycles. */
export interface ReactiveComputed<T> {
	get(): T;
}

/** Watcher contract used to subscribe and unsubscribe from computed values. */
export interface ReactiveWatcher {
	watch(signal: ReactiveComputed<unknown>): void;
	unwatch(signal: ReactiveComputed<unknown>): void;
}

/**
 * Internal runtime contract that supplies Radiant's reactivity primitives.
 *
 * Core code should target this contract rather than a concrete reactive
 * library so the dependency stays centralized and alternate implementations can
 * be introduced without rewriting core behavior.
 */
export interface ReactiveRuntime {
	trackDependency(node: ReactiveDependencyNode): void;
	createComputed<T>(read: () => T): ReactiveComputed<T>;
	createWatcher(notify: () => void): ReactiveWatcher;
}
