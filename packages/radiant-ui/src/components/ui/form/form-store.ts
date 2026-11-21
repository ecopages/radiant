import { createRulesResolver } from './resolvers';
import type { FormStateSnapshot, FormStateStore } from './form-state-store';
import { deletePath, getPath, setPath } from './value-path';
import type {
	FieldError,
	FieldRegistration,
	FieldRegistrationHandle,
	FieldRules,
	FieldValues,
	FormState,
	RegisterOptions,
	Resolver,
	ValidationMode,
} from './types';

export type FormStoreOptions<T extends FieldValues> = {
	defaultValues?: Partial<T>;
	values?: Partial<T>;
	resolver?: Resolver<T>;
	mode?: ValidationMode;
	reValidateMode?: ValidationMode;
};

type InternalField = FieldRegistration & {
	rules?: FieldRules;
	defaultValue?: unknown;
	getRules?: () => FieldRules | undefined;
	/** False once the registration was removed. */
	live: boolean;
	/** State of this entry's old name that another entry took, kept until this entry is renamed. */
	carried?: FieldState;
};

function normalizeResolver<T extends FieldValues>(resolver: unknown): Resolver<T> {
	if (typeof resolver === 'function') {
		return resolver as Resolver<T>;
	}
	return createRulesResolver<T>();
}

/** A field default counts only when it is neither `undefined` nor `null` (a bare `rui-field` reports `null`). */
export function hasDefault(value: unknown): boolean {
	return value !== undefined && value !== null;
}

type FieldState = { touched?: boolean; dirty?: boolean; error?: FieldError };

function withKey<R extends Partial<Record<string, unknown>>>(record: R, key: string, value: unknown): R {
	if (value === undefined) {
		if (!(key in record)) {
			return record;
		}
		const { [key]: _removed, ...rest } = record;
		return rest as R;
	}
	return { ...record, [key]: value } as R;
}

/**
 * The store `<rui-form>` creates when no store is injected. It also owns control
 * registration and submit state, which a {@link FormStateStore} does not.
 */
export class FormStore<T extends FieldValues = FieldValues> implements FormStateStore {
	mode: ValidationMode;
	reValidateMode: ValidationMode;
	private resolver: Resolver<T>;
	private readonly fields = new Map<string, InternalField>();
	private listeners = new Set<() => void>();
	private revision = 0;
	private defaultValues: Partial<T>;

	values: T;
	private ownErrors: Partial<Record<string, FieldError>> = {};
	private mergedErrors: Partial<Record<string, FieldError>> = this.ownErrors;
	private readonly sourceErrors = new Map<string, Record<string, FieldError>>();
	private snapshot: { values: T; errors: Partial<Record<string, FieldError>>; value: FormStateSnapshot } | undefined;
	touched: Partial<Record<string, boolean>> = {};
	dirty: Partial<Record<string, boolean>> = {};
	isSubmitting = false;
	isSubmitted = false;

	constructor(options: FormStoreOptions<T> = {}) {
		this.mode = options.mode ?? 'onSubmit';
		this.reValidateMode = options.reValidateMode ?? 'onChange';
		this.resolver = normalizeResolver(options.resolver);
		this.defaultValues = { ...(options.defaultValues ?? {}) } as Partial<T>;
		this.values = { ...this.defaultValues, ...(options.values ?? {}) } as T;
	}

	/**
	 * Resolver and rule errors merged with errors contributed through `setErrors`.
	 *
	 * @remarks A resolver or rule error wins over a source error on the same field.
	 * Assigning replaces the resolver and rule errors only.
	 */
	get errors(): Partial<Record<string, FieldError>> {
		return this.mergedErrors;
	}

	set errors(next: Partial<Record<string, FieldError>>) {
		this.ownErrors = next;
		this.mergeErrors();
	}

	/**
	 * Own errors (rules, the resolver and native validity) rank as `validation`, or
	 * `native` for a native one, and merge with `setErrors` sources in the order
	 * {@link formErrorSourceRank} declares; an own error wins a tie.
	 */
	private mergeErrors(): void {
		if (this.sourceErrors.size === 0) {
			this.mergedErrors = this.ownErrors;
			return;
		}
		const merged: Record<string, FieldError> = { ...this.ownErrors } as Record<string, FieldError>;
		for (const errors of this.sourceErrors.values()) {
			Object.assign(merged, errors);
		}
		this.mergedErrors = merged;
	}

	getValue(path: string): unknown {
		const field = this.fields.get(path);
		return field ? field.getValue() : getPath(this.values, path);
	}

	getSnapshot(): FormStateSnapshot {
		if (this.snapshot?.values !== this.values || this.snapshot.errors !== this.mergedErrors) {
			this.snapshot = {
				values: this.values,
				errors: this.mergedErrors,
				value: { values: this.values, errors: this.mergedErrors as Record<string, FieldError> },
			};
		}
		return this.snapshot.value;
	}

	async validate(paths?: string[]): Promise<boolean> {
		let valid = true;
		if (paths) {
			for (const path of paths) {
				valid = (await this.validateField(path)) && valid;
			}
		} else {
			valid = await this.validateAll();
		}
		const scope = paths ?? Object.keys(this.mergedErrors);
		return valid && scope.every((path) => !this.mergedErrors[path]);
	}

	setErrors(source: string, errors: Record<string, FieldError>): void {
		this.sourceErrors.delete(source);
		if (Object.keys(errors).length > 0) {
			this.sourceErrors.set(source, { ...errors });
		}
		this.mergeErrors();
		this.notify();
	}

	/** Update options without dropping registered fields. */
	updateOptions(options: FormStoreOptions<T>): void {
		if (options.mode !== undefined) {
			this.mode = options.mode;
		}
		if (options.reValidateMode !== undefined) {
			this.reValidateMode = options.reValidateMode;
		}
		if (options.resolver !== undefined) {
			this.resolver = normalizeResolver(options.resolver);
		}
		if (options.defaultValues !== undefined) {
			this.defaultValues = { ...(options.defaultValues as Partial<T>) };
		}
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.revision += 1;
		for (const listener of this.listeners) {
			listener();
		}
	}

	getRevision(): number {
		return this.revision;
	}

	getRegisteredFieldNames(): string[] {
		return Array.from(this.fields.keys());
	}

	register(registration: FieldRegistration): FieldRegistrationHandle {
		const existing = this.fields.get(registration.name);
		const entry: InternalField = {
			...registration,
			rules: registration.rules ?? existing?.rules,
			defaultValue: hasDefault(registration.defaultValue) ? registration.defaultValue : existing?.defaultValue,
			getRules: registration.getRules ?? existing?.getRules,
			live: true,
		};
		this.fields.set(registration.name, entry);

		if (getPath(this.values, registration.name) === undefined && hasDefault(entry.defaultValue)) {
			this.values = setPath(this.values, registration.name, entry.defaultValue);
		}

		entry.setValue(getPath(this.values, registration.name));

		return {
			rename: (name) => this.renameEntry(entry, name),
			unregister: () => this.removeEntry(entry),
		};
	}

	private removeEntry(entry: InternalField): void {
		if (!entry.live) {
			return;
		}
		entry.live = false;
		entry.carried = undefined;
		if (this.fields.get(entry.name) === entry) {
			this.fields.delete(entry.name);
		}
		this.notify();
	}

	/**
	 * Move an entry to `to` with its value and field state.
	 *
	 * @remarks The value comes from the control, which is the truth for a keyed row
	 * that moved. Touched, dirty and own-error state lives under a name, so an entry
	 * whose name another entry takes first carries its state until it is renamed
	 * too: two rows can swap names in two calls without either losing state. The old
	 * name is cleared only when no entry still holds it.
	 */
	private renameEntry(entry: InternalField, to: string): void {
		const from = entry.name;
		if (!entry.live || from === to) {
			return;
		}
		const moved = entry.carried ?? this.readFieldState(from);
		const occupant = this.fields.get(to);
		if (occupant && occupant !== entry && !occupant.carried) {
			occupant.carried = this.readFieldState(to);
		}
		if (this.fields.get(from) === entry) {
			this.fields.delete(from);
		}
		this.fields.set(to, entry);
		entry.name = to;
		entry.carried = undefined;
		if (!this.fields.has(from)) {
			this.values = deletePath(this.values, from);
			this.writeFieldState(from, {});
		}
		const value = entry.getValue();
		this.values = value === undefined ? deletePath(this.values, to) : setPath(this.values, to, value);
		this.writeFieldState(to, moved);
		this.notify();
	}

	/**
	 * Write the stored value into every registered control whose path is `path`, under
	 * it or above it, so replacing a branch reaches the controls inside it and writing
	 * inside a control that holds an object reaches that control.
	 */
	private rewriteRelatedControls(path: string): void {
		for (const [name, field] of this.fields) {
			if (name === path || name.startsWith(`${path}.`) || path.startsWith(`${name}.`)) {
				field.setValue(getPath(this.values, name));
			}
		}
	}

	private readFieldState(name: string): FieldState {
		return {
			touched: this.touched[name],
			dirty: this.dirty[name],
			error: this.ownErrors[name],
		};
	}

	private writeFieldState(name: string, state: FieldState): void {
		this.touched = withKey(this.touched, name, state.touched);
		this.dirty = withKey(this.dirty, name, state.dirty);
		this.errors = withKey(this.ownErrors, name, state.error);
	}

	/**
	 * @remarks A present `defaultValue` key always overwrites, and `null` clears the
	 * field default, so a default that is removed stops winning on reset.
	 */
	updateFieldOptions(name: string, options: RegisterOptions): void {
		const field = this.fields.get(name);
		if (!field) {
			return;
		}
		if (options.rules !== undefined) {
			field.rules = options.rules;
		}
		if ('defaultValue' in options) {
			field.defaultValue = hasDefault(options.defaultValue) ? options.defaultValue : undefined;
		}
	}

	getValues(): T {
		let next = this.values;
		for (const [name, field] of this.fields) {
			next = setPath(next, name, field.getValue());
		}
		return next;
	}

	/**
	 * Write a value as a change, the way the injected store contract defines it: the
	 * field becomes dirty, validation runs per `mode`, and an error a host set at the
	 * path with `setErrors` is cleared, since the user has now edited that field.
	 */
	setValue(name: string, value: unknown, options?: { shouldTouch?: boolean }): void {
		this.values = setPath(this.values, name, value);
		this.rewriteRelatedControls(name);
		if (options?.shouldTouch) {
			this.touched = { ...this.touched, [name]: true };
		}
		this.afterChange(name).catch((error: unknown) => reportError(error));
	}

	private async afterChange(name: string): Promise<void> {
		this.dirty = { ...this.dirty, [name]: true };
		this.clearSourceErrorsAt(name);
		if (this.shouldValidate(name, 'change')) {
			await this.validateField(name);
		} else {
			this.notify();
		}
	}

	private clearSourceErrorsAt(name: string): void {
		let changed = false;
		for (const [source, errors] of this.sourceErrors) {
			if (name in errors) {
				const { [name]: _removed, ...rest } = errors;
				if (Object.keys(rest).length > 0) {
					this.sourceErrors.set(source, rest);
				} else {
					this.sourceErrors.delete(source);
				}
				changed = true;
			}
		}
		if (changed) {
			this.mergeErrors();
		}
	}

	markTouched(name: string): void {
		this.touched = { ...this.touched, [name]: true };
		this.notify();
	}

	markDirty(name: string): void {
		this.dirty = { ...this.dirty, [name]: true };
		this.notify();
	}

	clearErrors(name?: string): void {
		if (name) {
			const next = { ...this.ownErrors };
			delete next[name];
			for (const [source, errors] of this.sourceErrors) {
				this.sourceErrors.set(
					source,
					Object.fromEntries(Object.entries(errors).filter(([path]) => path !== name)),
				);
			}
			this.errors = next;
			this.notify();
			return;
		}
		this.sourceErrors.clear();
		this.errors = {};
		this.notify();
	}

	/** The message to show, or `undefined` when the field has no error or its error has no message. */
	getFieldError(name: string): string | undefined {
		return this.errors[name]?.message || undefined;
	}

	getState(): FormState<T> {
		const values = this.getValues();
		const errorCount = Object.keys(this.errors).length;
		return {
			values,
			errors: this.errors,
			touched: this.touched,
			dirty: this.dirty,
			isSubmitting: this.isSubmitting,
			isSubmitted: this.isSubmitted,
			isValid: errorCount === 0,
		};
	}

	async validateField(name: string): Promise<boolean> {
		const values = this.getValues();
		const result = await this.resolver(values, { fields: this.buildResolverFields() }, { names: [name] });
		const next = { ...this.ownErrors };
		const resolverError: FieldError | undefined = (result.errors as Partial<Record<string, FieldError>>)[name];
		const nativeError = resolverError?.message ? undefined : this.readNativeError(name);
		const error = nativeError ?? resolverError;
		if (error) {
			next[name] = nativeError ?? { type: 'validation', message: error.message };
		} else {
			delete next[name];
		}
		this.errors = next;
		this.notify();
		return !error;
	}

	async validateAll(): Promise<boolean> {
		const values = this.getValues();
		const result = await this.resolver(values, { fields: this.buildResolverFields() }, {});
		const errors = { ...result.errors } as Partial<Record<string, FieldError>>;
		for (const name of this.fields.keys()) {
			const resolverError = errors[name];
			const native = resolverError?.message ? undefined : this.readNativeError(name);
			if (native) {
				errors[name] = native;
			}
		}
		this.errors = errors;
		this.notify();
		return Object.keys(this.mergedErrors).length === 0;
	}

	/**
	 * @remarks Evaluated after the resolver, so a custom resolver cannot disable it
	 * and a rule or resolver message wins. Reads `validity` data only; it never
	 * calls `checkValidity()`, which fires an `invalid` event.
	 */
	private readNativeError(name: string): FieldError | undefined {
		const validity = this.fields.get(name)?.getValidity?.();
		if (!validity || validity.valid) {
			return undefined;
		}
		return { type: validity.type ?? 'customError', message: validity.message || undefined };
	}

	shouldValidate(name: string, trigger: 'change' | 'blur'): boolean {
		const mode = this.isSubmitted ? this.reValidateMode : this.mode;

		switch (mode) {
			case 'all':
				return true;
			case 'onChange':
				return trigger === 'change';
			case 'onBlur':
				return trigger === 'blur';
			case 'onTouched':
				return trigger === 'blur' && Boolean(this.touched[name]);
			case 'onSubmit':
				return false;
			default:
				return false;
		}
	}

	async handleFieldChange(name: string): Promise<void> {
		const field = this.fields.get(name);
		if (!field) {
			return;
		}
		this.values = setPath(this.values, name, field.getValue());
		await this.afterChange(name);
	}

	/** Interface form of {@link FormStore.handleFieldBlur}; validation runs per `mode`. */
	blur(path: string): void {
		void this.handleFieldBlur(path);
	}

	async handleFieldBlur(name: string): Promise<void> {
		this.markTouched(name);
		if (this.shouldValidate(name, 'blur')) {
			await this.validateField(name);
		} else {
			this.notify();
		}
	}

	/** Whether a field's validation message should be shown in the UI (RHF-style). */
	shouldDisplayFieldError(name: string): boolean {
		if (!this.errors[name]) {
			return false;
		}
		if (this.isSubmitted) {
			return true;
		}

		switch (this.mode) {
			case 'all':
				return Boolean(this.dirty[name] || this.touched[name]);
			case 'onChange':
				return Boolean(this.dirty[name]);
			case 'onBlur':
			case 'onTouched':
				return Boolean(this.touched[name]);
			case 'onSubmit':
			default:
				return false;
		}
	}

	/**
	 * Validate, then run `onValid` with the values or `onInvalid` with the errors.
	 *
	 * @remarks `isSubmitting` stays true until the whole submission settles,
	 * including an awaited `onValid`, and is always cleared. A validation that
	 * throws counts as invalid: `onInvalid` receives the current errors and the
	 * thrown value as `error`, and the returned promise resolves. A rejection from
	 * `onValid` clears `isSubmitting` and rejects.
	 */
	async handleSubmit(
		onValid: (values: T) => void | Promise<void>,
		onInvalid?: (errors: Partial<Record<string, FieldError>>, error?: unknown) => void,
	): Promise<void> {
		this.isSubmitting = true;
		this.isSubmitted = true;

		for (const name of this.fields.keys()) {
			this.touched = { ...this.touched, [name]: true };
		}
		this.notify();

		try {
			let valid: boolean;
			try {
				valid = await this.validateAll();
			} catch (error) {
				onInvalid?.(this.errors, error);
				return;
			}
			if (valid) {
				await onValid(this.getValues());
				return;
			}
			onInvalid?.(this.errors);
		} finally {
			this.isSubmitting = false;
			this.notify();
		}
	}

	reset(values?: Partial<T>): void {
		this.values = values ? ({ ...values } as T) : this.withFieldDefaults({ ...this.defaultValues } as T);
		this.sourceErrors.clear();
		this.errors = {};
		this.touched = {};
		this.dirty = {};
		this.isSubmitted = false;
		this.isSubmitting = false;
		for (const field of this.fields.values()) {
			field.setValue(getPath(this.values, field.name));
		}
		this.notify();
	}

	/**
	 * @remarks A field without an explicit default reports `null` (the `@prop`
	 * default of `rui-field`). Only a non-null default overrides the form's
	 * `defaultValues`, so a bare field never wipes them on reset.
	 */
	private withFieldDefaults(tree: T): T {
		let next = tree;
		for (const [name, field] of this.fields) {
			if (hasDefault(field.defaultValue)) {
				next = setPath(next, name, field.defaultValue);
			}
		}
		return next;
	}

	private buildResolverFields(): Record<string, { rules?: FieldRules }> {
		const fields: Record<string, { rules?: FieldRules }> = {};
		for (const [name, field] of this.fields) {
			const rules = field.getRules?.() ?? field.rules;
			fields[name] = { rules };
		}
		return fields;
	}
}
