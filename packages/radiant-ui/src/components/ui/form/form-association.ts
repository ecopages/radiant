export type FormAssociationHost = HTMLElement & {
	attachInternals?: () => ElementInternals;
};

/**
 * Marks the constructor as form-associated before `customElements.define`.
 *
 * @remarks Sit this above `@customElement` so the initializer runs first. A
 * `static formAssociated` field on the class body breaks Storybook's decorator
 * transform (`ReferenceError: <Class> is not defined`).
 */
export function formAssociated<T extends CustomElementConstructor>(
	_target: T,
	context: ClassDecoratorContext<T>,
): void {
	context.addInitializer(function (this: T) {
		Object.defineProperty(this, 'formAssociated', { value: true });
	});
}

/**
 * Wraps `ElementInternals` so a named catalog host joins a native `<form>` like `<input name>`.
 *
 * @remarks The custom-element class still needs {@link formAssociated} (or
 * `static formAssociated = true` on a class the bundler does not decorate).
 * The browser reads that on the constructor. `attachInternals` is skipped when
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
