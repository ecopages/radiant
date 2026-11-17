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

/** Whether a member state accepts writes, as opposed to a read-only `{ get, subscribe }` object. */
export function isWritableState<T>(member: ReadonlyReactiveState<T>): member is ReactiveState<T> {
	return 'set' in member && typeof member.set === 'function';
}
