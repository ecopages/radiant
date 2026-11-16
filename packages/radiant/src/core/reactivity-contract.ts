/** Writable state used for an individual host member. */
export interface ReactiveState<T> {
	get(): T;
	set(value: T): void;
	subscribe(notify: (value: T) => void): () => void;
	update?(updater: (value: T) => T): void;
}
