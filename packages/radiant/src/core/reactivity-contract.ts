/**
 * Read-only state a host member can be backed by: everything `this.$`,
 * `@onUpdated`, `@bindTo` and SSR observation need.
 */
export interface ReadonlyReactiveState<T> {
	get(): T;
	subscribe(notify: (value: T) => void): () => void;
}

/** Writable state used for an individual host member. */
export interface ReactiveState<T> extends ReadonlyReactiveState<T> {
	set(value: T): void;
	update?(updater: (value: T) => T): void;
}
