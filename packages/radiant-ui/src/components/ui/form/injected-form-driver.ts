import type { FormDriver } from './form-driver';
import { FORM_NATIVE_ERROR_SOURCE, type FormStateStore } from './form-state-store';
import { hasDefault, type FormStoreOptions } from './form-store';
import type { FieldError, FieldRegistration, FieldValues, RegisterOptions, ValidationMode } from './types';

type DrivenField = FieldRegistration & { defaultValue?: unknown };

/**
 * Structural equality for control values; `null` and `undefined` both mean "no value".
 *
 * @remarks Dates compare by time. Any other non-plain object compares by identity,
 * so it is rewritten rather than wrongly treated as equal.
 */
export function isSameValue(a: unknown, b: unknown): boolean {
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
	const keys = Object.keys(a);
	return (
		keys.length === Object.keys(b).length &&
		keys.every((key) => isSameValue(Reflect.get(a, key), Reflect.get(b, key)))
	);
}

function isPlainObject(value: object): boolean {
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

/**
 * Drives a host {@link FormStateStore}: it owns control registration, native
 * validity, touched and dirty bookkeeping, validation timing and submit, and leaves
 * values and errors to the store.
 *
 * @remarks Field `rules`, `resolver` and `defaultValues` belong to the built-in
 * {@link FormStore} and are ignored here; the store validates. The store
 * subscription lives only while the driver has a listener, so a disconnected form
 * does not keep the host store alive.
 */
export class InjectedFormDriver implements FormDriver {
	mode: ValidationMode;
	reValidateMode: ValidationMode;
	private readonly fields = new Map<string, DrivenField>();
	private readonly touched = new Set<string>();
	private readonly dirty = new Set<string>();
	private readonly lastSeen = new Map<string, unknown>();
	private readonly listeners = new Set<() => void>();
	private nativeErrors: Record<string, FieldError> = {};
	private submitted = false;
	private revision = 0;
	private unsubscribeStore: (() => void) | undefined;

	constructor(
		private readonly state: FormStateStore,
		options: Pick<FormStoreOptions<FieldValues>, 'mode' | 'reValidateMode'> = {},
	) {
		this.mode = options.mode ?? 'onSubmit';
		this.reValidateMode = options.reValidateMode ?? 'onChange';
	}

	updateOptions(options: FormStoreOptions<FieldValues>): void {
		this.mode = options.mode ?? this.mode;
		this.reValidateMode = options.reValidateMode ?? this.reValidateMode;
	}

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
		const existing = this.fields.get(registration.name);
		const entry: DrivenField = {
			...registration,
			defaultValue: hasDefault(registration.defaultValue) ? registration.defaultValue : existing?.defaultValue,
		};
		this.fields.set(registration.name, entry);
		if (this.state.getValue(registration.name) === undefined && hasDefault(entry.defaultValue)) {
			this.state.setValue(registration.name, entry.defaultValue);
		}
		const seeded = this.state.getValue(registration.name);
		this.lastSeen.set(registration.name, seeded);
		entry.setValue(seeded);

		return () => {
			if (this.fields.get(registration.name) === entry) {
				this.fields.delete(registration.name);
				this.touched.delete(registration.name);
				this.dirty.delete(registration.name);
				this.lastSeen.delete(registration.name);
				if (this.nativeErrors[registration.name]) {
					const { [registration.name]: _gone, ...rest } = this.nativeErrors;
					this.nativeErrors = rest;
					this.state.setErrors(FORM_NATIVE_ERROR_SOURCE, rest);
				}
				this.bump();
			}
		};
	}

	updateFieldOptions(name: string, options: RegisterOptions): void {
		const field = this.fields.get(name);
		if (field && 'defaultValue' in options) {
			field.defaultValue = hasDefault(options.defaultValue) ? options.defaultValue : undefined;
		}
	}

	getFieldError(name: string): string | undefined {
		return this.errors[name]?.message;
	}

	/** Same display timing as the built-in store, from this driver's own touched and dirty sets. */
	shouldDisplayFieldError(name: string): boolean {
		if (!this.getFieldError(name)) {
			return false;
		}
		if (this.submitted) {
			return true;
		}
		switch (this.mode) {
			case 'all':
				return this.dirty.has(name) || this.touched.has(name);
			case 'onChange':
				return this.dirty.has(name);
			case 'onBlur':
			case 'onTouched':
				return this.touched.has(name);
			default:
				return false;
		}
	}

	private shouldValidate(name: string, trigger: 'change' | 'blur'): boolean {
		switch (this.submitted ? this.reValidateMode : this.mode) {
			case 'all':
				return true;
			case 'onChange':
				return trigger === 'change';
			case 'onBlur':
				return trigger === 'blur';
			case 'onTouched':
				return trigger === 'blur' && this.touched.has(name);
			default:
				return false;
		}
	}

	/**
	 * Re-read native validity for `names` and push the full `native` source to the
	 * store. Skips the call when both the old and new maps are empty.
	 *
	 * @remarks Reads `validity` data only; it never calls `checkValidity()`, which
	 * fires an `invalid` event.
	 */
	private publishNativeErrors(names: string[], replaceAll: boolean): void {
		const next = replaceAll ? {} : { ...this.nativeErrors };
		for (const name of names) {
			const validity = this.fields.get(name)?.getValidity?.();
			if (validity && !validity.valid) {
				next[name] = { type: 'native', message: validity.message || 'Invalid value' };
			} else {
				delete next[name];
			}
		}
		const bothEmpty = Object.keys(this.nativeErrors).length === 0 && Object.keys(next).length === 0;
		this.nativeErrors = next;
		if (!bothEmpty) {
			this.state.setErrors(FORM_NATIVE_ERROR_SOURCE, next);
		}
	}

	private async validateField(name: string): Promise<boolean> {
		this.publishNativeErrors([name], false);
		const valid = await this.state.validate([name]);
		return valid && !this.nativeErrors[name];
	}

	private async validateAll(): Promise<boolean> {
		this.publishNativeErrors(this.getRegisteredFieldNames(), true);
		const valid = await this.state.validate();
		return valid && Object.keys(this.nativeErrors).length === 0;
	}

	async handleFieldChange(name: string): Promise<void> {
		const field = this.fields.get(name);
		if (!field) {
			return;
		}
		this.state.setValue(name, field.getValue());
		this.dirty.add(name);
		if (this.shouldValidate(name, 'change')) {
			await this.validateField(name);
		}
		this.bump();
	}

	async handleFieldBlur(name: string): Promise<void> {
		this.touched.add(name);
		if (this.shouldValidate(name, 'blur')) {
			await this.validateField(name);
		}
		this.bump();
	}

	async handleSubmit(
		onValid: (values: FieldValues) => void | Promise<void>,
		onInvalid?: (errors: Partial<Record<string, FieldError>>) => void,
	): Promise<void> {
		this.submitted = true;
		for (const name of this.fields.keys()) {
			this.touched.add(name);
		}
		this.bump();

		const valid = await this.validateAll();
		this.bump();
		const snapshot = this.state.getSnapshot();
		if (valid) {
			await onValid(snapshot.values);
			return;
		}
		onInvalid?.(snapshot.errors);
	}

	/**
	 * Write the store values once more after the current task.
	 *
	 * @remarks The `reset` event fires before the browser resets the form's controls
	 * to their default attributes, which would overwrite the values just restored.
	 */
	private syncControlsAfterNativeReset(): void {
		setTimeout(() => this.syncControls(true), 0);
	}

	/** Withdraw the `native` errors this driver contributed; call before leaving the store. */
	dispose(): void {
		if (Object.keys(this.nativeErrors).length > 0) {
			this.nativeErrors = {};
			this.state.setErrors(FORM_NATIVE_ERROR_SOURCE, {});
		}
	}

	reset(): void {
		const hadNative = Object.keys(this.nativeErrors).length > 0;
		this.nativeErrors = {};
		this.state.reset();
		if (hadNative) {
			this.state.setErrors(FORM_NATIVE_ERROR_SOURCE, {});
		}
		this.touched.clear();
		this.dirty.clear();
		this.submitted = false;
		this.syncControls(true);
		this.syncControlsAfterNativeReset();
		this.bump();
	}
}
