export type FormAssociationHost = HTMLElement & {
	attachInternals?: () => ElementInternals;
};

/**
 * Wraps `ElementInternals` so `RuiField` (or a listed custom host) can join a native `<form>`.
 *
 * @remarks The custom-element class still sets `static formAssociated = true`;
 * the browser reads that on the constructor. `attachInternals` is skipped when
 * missing (SSR). Wrap controls in `RuiField` instead of calling this from each input.
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

/** Flattens a field-protocol value into a single form entry. */
export function serializeFormValue(value: unknown): string | null {
	if (value == null || value === false || value === '') {
		return null;
	}
	if (value === true) {
		return 'on';
	}
	if (Array.isArray(value)) {
		return value.length === 0 ? null : value.map(String).join(',');
	}
	return String(value);
}
