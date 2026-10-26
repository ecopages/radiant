/**
 * Provides the async-local store API needed by browser-side SSR tests.
 *
 * @remarks These tests call SSR helpers synchronously; this implementation does not propagate stores across async callbacks.
 */
export class AsyncLocalStorage<Store> {
	private currentStore: Store | undefined;

	public enterWith(store: Store): void {
		this.currentStore = store;
	}

	public getStore(): Store | undefined {
		return this.currentStore;
	}

	public run<Result>(store: Store, callback: () => Result): Result {
		const previousStore = this.currentStore;
		this.currentStore = store;

		try {
			return callback();
		} finally {
			this.currentStore = previousStore;
		}
	}
}
