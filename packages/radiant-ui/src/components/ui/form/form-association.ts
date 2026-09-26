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
export class FormAssociation {
	#internals?: ElementInternals;

	constructor(host: FormAssociationHost) {
		if (typeof host.attachInternals === 'function') {
			this.#internals = host.attachInternals();
		}
	}

	set(value: File | string | FormData | null): void {
		this.#internals?.setFormValue(value);
	}
}
