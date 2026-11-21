import type { FormDriver } from './form-driver';
import { FORM_NATIVE_ERROR_SOURCE, type FormStateStore } from './form-state-store';
import type { FieldError, FieldRegistration, FieldValues, RegisterOptions } from './types';

/**
 * Structural equality for control values; `null` and `undefined` both mean "no value".
 *
 * @remarks Dates compare by time. Any other non-plain object compares by identity,
 * so it is rewritten rather than wrongly treated as equal.
 */
function isSameValue(a: unknown, b: unknown): boolean {
	if (Object.is(a, b) || (a == null && b == null)) {
		return true;
	}
	if (Array.isArray(a) || Array.isArray(b)) {
		return isSameArray(a, b);
	}
	if (a instanceof Date || b instanceof Date) {
		return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
	}
	return isSameRecord(a, b);
}

function isSameArray(a: unknown, b: unknown): boolean {
	return (
		Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => isSameValue(item, b[i]))
	);
}

function isSameRecord(a: unknown, b: unknown): boolean {
	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
		return false;
	}
	if (!isPlainObject(a) || !isPlainObject(b)) {
		return false;
	}
	const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
	return [...keys].every((key) => isSameValue(Reflect.get(a, key), Reflect.get(b, key)));
}

function isPlainObject(value: object): boolean {
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

/**
 * Bridges a host {@link FormStateStore} to the form's controls. It owns control
 * registration, the control value bridge and native validity, and keeps no
 * touched, dirty or submitted state: the store owns validation timing, field
 * state and which errors show.
 *
 * @remarks Field `rules`, `resolver`, `defaultValue`, `defaultValues`, `mode` and
 * `revalidate-mode` are ignored here. Native validity is re-read from the controls
 * on every change, blur and submit, never replayed from an earlier read. The
 * store subscription lives only while the driver has a listener, so a
 * disconnected form does not keep the host store alive.
 */
export class InjectedFormDriver implements FormDriver {
	private readonly fields = new Map<string, FieldRegistration>();
	private readonly lastSeen = new Map<string, unknown>();
	private readonly listeners = new Set<() => void>();
	private revision = 0;
	private unsubscribeStore: (() => void) | undefined;
	private resetTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(private readonly state: FormStateStore) {}

	get errors(): Partial<Record<string, FieldError>> {
		return this.state.getSnapshot().errors;
	}

	getRevision(): number {
		return this.revision;
	}

	subscribe(listener: () => void): () => void {
		if (this.listeners.size === 0) {
			this.unsubscribeStore = this.state.subscribe(() => {
				this.syncControls();
				this.bump();
			});
			this.syncControls();
		}
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
			if (this.listeners.size === 0) {
				this.unsubscribeStore?.();
				this.unsubscribeStore = undefined;
			}
		};
	}

	private bump(): void {
		this.revision += 1;
		for (const listener of [...this.listeners]) {
			listener();
		}
	}

	/**
	 * Write a path's store value into its control, but only when the store value
	 * changed since this driver last saw it (or `force` is set, as on reset).
	 *
	 * @remarks Comparing with the last seen store value, not only with the control,
	 * keeps an unrelated store notification, such as a `setErrors` call or another
	 * field's validation, from reverting input a control holds but has not yet
	 * committed. A control's own write reaches the store and then equals the store
	 * value, so it is never echoed back.
	 */
	private syncControls(force = false): void {
		for (const [name, field] of this.fields) {
			const next = this.state.getValue(name);
			const changed = !isSameValue(next, this.lastSeen.get(name));
			this.lastSeen.set(name, next);
			if ((force || changed) && !isSameValue(next, field.getValue())) {
				field.setValue(next);
			}
		}
	}

	getRegisteredFieldNames(): string[] {
		return Array.from(this.fields.keys());
	}

	register(registration: FieldRegistration): () => void {
		this.fields.set(registration.name, registration);
		const seeded = this.state.getValue(registration.name);
		this.lastSeen.set(registration.name, seeded);
		registration.setValue(seeded);

		return () => {
			if (this.fields.get(registration.name) === registration) {
				this.fields.delete(registration.name);
				this.lastSeen.delete(registration.name);
				this.publishNativeErrors();
				this.bump();
			}
		};
	}

	updateFieldOptions(_name: string, _options: RegisterOptions): void {}

	getFieldError(name: string): string | undefined {
		return this.errors[name]?.message;
	}

	/** The store decides which errors show, so every error in the snapshot is presented. */
	shouldDisplayFieldError(name: string): boolean {
		return Boolean(this.getFieldError(name));
	}

	/** Write a control's value into the store when it differs, as a control change no event reported would not. */
	private writeControlValue(name: string, field: FieldRegistration): void {
		const value = field.getValue();
		if (!isSameValue(value, this.state.getValue(name))) {
			this.state.setValue(name, value);
		}
	}

	/**
	 * Send every registered control's current native validity as the `native` source.
	 *
	 * @remarks Reads `validity` data only; it never calls `checkValidity()`, which
	 * fires an `invalid` event.
	 */
	private publishNativeErrors(): void {
		const errors: Record<string, FieldError> = {};
		for (const [name, field] of this.fields) {
			const validity = field.getValidity?.();
			if (validity && !validity.valid) {
				errors[name] = { type: 'native', message: validity.message || 'Invalid value' };
			}
		}
		this.state.setErrors(FORM_NATIVE_ERROR_SOURCE, errors);
	}

	async handleFieldChange(name: string): Promise<void> {
		const field = this.fields.get(name);
		if (!field) {
			return;
		}
		this.writeControlValue(name, field);
		this.publishNativeErrors();
		this.bump();
	}

	async handleFieldBlur(name: string): Promise<void> {
		const field = this.fields.get(name);
		if (!field) {
			return;
		}
		this.writeControlValue(name, field);
		this.publishNativeErrors();
		this.state.blur(name);
		this.bump();
	}

	async handleSubmit(
		onValid: (values: FieldValues) => void | Promise<void>,
		onInvalid?: (errors: Partial<Record<string, FieldError>>) => void,
	): Promise<void> {
		for (const [name, field] of this.fields) {
			this.writeControlValue(name, field);
		}
		this.publishNativeErrors();
		const valid = await this.state.validate();
		this.bump();
		const snapshot = this.state.getSnapshot();
		if (valid) {
			await onValid(snapshot.values);
			return;
		}
		onInvalid?.(snapshot.errors);
	}

	/**
	 * Cancel a pending post-reset write and withdraw the `native` errors this driver
	 * sent; call before leaving the store.
	 */
	dispose(): void {
		clearTimeout(this.resetTimer);
		this.state.setErrors(FORM_NATIVE_ERROR_SOURCE, {});
	}

	/**
	 * Reset the store and rewrite the controls from it, again after the current task.
	 *
	 * @remarks The `reset` event fires before the browser resets the form's controls
	 * to their default attributes, which would overwrite the values just restored.
	 */
	reset(): void {
		this.state.reset();
		this.syncControls(true);
		clearTimeout(this.resetTimer);
		this.resetTimer = setTimeout(() => {
			this.syncControls(true);
			this.bump();
		}, 0);
		this.bump();
	}
}
