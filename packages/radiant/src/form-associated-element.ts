import { RadiantElement } from './core/radiant-element';
import type { ReactiveState } from './core/reactivity-contract';

/** A value `ElementInternals.setFormValue()` accepts. */
export type FormValue = File | string | FormData | null;

/**
 * Base class for a form-associated custom element (FACE): a host that lists on
 * native `FormData`, follows fieldset disability, and restores on form reset
 * like a native control.
 *
 * It owns the single `ElementInternals`, the reflected `name` and `disabled`
 * properties, the effective disabled state, the reset value, and the submission
 * value. A subclass supplies {@link formValue} and {@link restoreFormState}.
 *
 * @remarks
 * `formAssociated` is a static getter. The browser reads it once, at
 * `customElements.define()`. A static accessor exists as soon as the class is
 * evaluated, before any decorator runs, so `@customElement` sees it whether it
 * defines the element from legacy `__decorate` or from a standard
 * `addInitializer`. Subclasses inherit it.
 *
 * The submission value is synced from {@link updated} after every update cycle
 * and after a reset. A subclass that overrides `updated()` must call
 * `super.updated(changed)`.
 *
 * Reset follows the native `defaultValue` model. The reset value is the
 * {@link formState} the host holds when its first update cycle after connecting
 * finishes, so authored attributes, JSX props, and writes made before that cycle
 * count. Later writes, like `input.value = x` on a native input, do not move it.
 *
 * `attachInternals()` is skipped when the DOM lacks it (the SSR DOM shim), so
 * {@link internals} is `undefined` on the server.
 */
export abstract class FormAssociatedElement extends RadiantElement {
	static get formAssociated(): boolean {
		return true;
	}

	/**
	 * @remarks Standard `@customElement` reads `@prop` metadata from the class it
	 * defines, not an abstract parent, so `name` and `disabled` stay on this
	 * inherited getter. The constructor still calls `createReactiveProp` for the
	 * accessors.
	 */
	static get observedAttributes(): string[] {
		return ['name', 'disabled'];
	}

	/** Form field name. The browser skips an unnamed host when it builds `FormData`. */
	declare name: string;

	/** The host's own `disabled` attribute. See {@link effectiveDisabled} for fieldset disability. */
	declare disabled: boolean;

	/**
	 * The host's only `ElementInternals`, for validity, custom states, and ARIA.
	 *
	 * @remarks A second `attachInternals()` call throws `NotSupportedError`, so
	 * subclasses use this instance instead of attaching their own.
	 */
	protected readonly internals: ElementInternals | undefined;

	readonly #formDisabled: ReactiveState<boolean | undefined>;
	#reset?: { state: FormValue };

	constructor() {
		super();
		this.internals = typeof this.attachInternals === 'function' ? this.attachInternals() : undefined;
		this.createReactiveProp('name', { type: String, reflect: true, defaultValue: '' });
		this.createReactiveProp('disabled', { type: Boolean, reflect: true, defaultValue: false });
		this.#formDisabled = this.createReactiveMember<boolean | undefined>('effectiveDisabled', undefined);
	}

	/**
	 * Whether the host is disabled by its own `disabled` attribute or by a disabled
	 * ancestor fieldset. Watch it with `@onUpdated('effectiveDisabled')`.
	 *
	 * @remarks The browser reports the state through `formDisabledCallback`, which
	 * also fires when the host's own attribute toggles. Until it has reported (and
	 * always on the server) this falls back to `disabled`.
	 */
	get effectiveDisabled(): boolean {
		return this.#formDisabled.get() ?? this.disabled;
	}

	/** The value this host submits. The browser ignores it while the host is unnamed or disabled. */
	protected abstract formValue(): FormValue;

	/**
	 * The restoration state passed as `setFormValue(value, state)` and kept as the reset value.
	 *
	 * @remarks Defaults to {@link formValue}. Override it when the submission value
	 * cannot be parsed back, such as `FormData` with several entries.
	 */
	protected formState(): FormValue {
		return this.formValue();
	}

	/** Writes a state from {@link formState} back onto the host. Called on form reset. */
	protected abstract restoreFormState(state: FormValue): void;

	protected override updated(changed: ReadonlySet<string>): void {
		super.updated(changed);
		this.syncFormValue();
	}

	formDisabledCallback(disabled: boolean): void {
		this.#formDisabled.set(disabled);
	}

	formResetCallback(): void {
		if (this.#reset) {
			this.restoreFormState(this.#reset.state);
		}
		this.syncFormValue();
	}

	/**
	 * Pushes {@link formValue} / {@link formState} to `ElementInternals`.
	 *
	 * @remarks The first call stores the reset value. Call it from pointer
	 * handlers that change the submitted value without a reactive write.
	 */
	protected syncFormValue(): void {
		const state = this.formState();
		this.#reset ??= { state };
		this.internals?.setFormValue(this.formValue(), state);
	}
}
