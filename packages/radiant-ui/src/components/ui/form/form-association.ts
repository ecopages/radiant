export type FormAssociationHost = HTMLElement & {
	attachInternals?: () => ElementInternals;
};

/**
 * Wraps `ElementInternals` submission values and the initial value used by native reset.
 *
 * @remarks The constructor must be form-associated before `customElements.define`.
 * Use `static get formAssociated()` next to `@customElement` — a static field
 * leaves the class name unbound in Storybook's decorator transform.
 * `attachInternals` is skipped when missing (SSR). Hosts own their validity and
 * browser state restoration behavior when they need those native features.
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
