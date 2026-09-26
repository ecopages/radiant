export type FormAssociationHost = HTMLElement & {
	attachInternals?: () => ElementInternals;
};

/**
 * Wraps `ElementInternals` so a named catalog host joins a native `<form>` like `<input name>`.
 *
 * @remarks The custom-element class still sets `static formAssociated = true`;
 * the browser reads that on the constructor. `attachInternals` is skipped when
 * missing (SSR).
 */
export class FormAssociation<T = unknown> {
	#internals?: ElementInternals;
	#initial?: T;
	#hasInitial = false;

	constructor(host: FormAssociationHost) {
		if (typeof host.attachInternals === 'function') {
			this.#internals = host.attachInternals();
		}
	}

	set(value: File | string | FormData | null): void {
		this.#internals?.setFormValue(value);
	}

	/**
	 * Value `formResetCallback` restores. The first call wins, including across reconnect.
	 *
	 * @remarks Arrays are copied so a later in-place edit does not move the reset target.
	 */
	remember(value: T): void {
		if (this.#hasInitial) {
			return;
		}
		this.#hasInitial = true;
		this.#initial = (Array.isArray(value) ? value.slice() : value) as T;
	}

	get initial(): T {
		return this.#initial as T;
	}
}
